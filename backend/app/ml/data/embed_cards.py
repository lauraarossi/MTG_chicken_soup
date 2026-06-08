"""Generate and store pgvector embeddings for all Commander-legal cards.

Usage (from the backend/ directory inside Docker or a venv):
    python -m app.ml.data.embed_cards

Requires:
  - data/processed/card_index.json (run fetch_scryfall.py first)
  - DATABASE_URL pointing at a pgvector-enabled Postgres
  - For OpenAI (default): OPENAI_API_KEY set in .env
  - For Ollama: EMBEDDING_PROVIDER=ollama + Ollama running with nomic-embed-text pulled
"""
import asyncio
import json
import time
from pathlib import Path

import httpx
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from tqdm import tqdm

from app.config import settings
from app.database import Base
from app.models.card_embedding import CardEmbedding, EMBEDDING_DIM

_db_url = settings.database_url.replace("postgres://", "postgresql+asyncpg://", 1).replace("postgresql://", "postgresql+asyncpg://", 1)
# NullPool: no connection reuse — each batch gets a fresh TCP connection.
# Required for long-running remote scripts where proxies close idle connections.
_engine = create_async_engine(_db_url, echo=False, poolclass=NullPool)
_Session = async_sessionmaker(_engine, expire_on_commit=False)

CARD_INDEX = Path("data/processed/card_index.json")
BATCH_SIZE = 32


def _card_text(card: dict) -> str:
    color_names = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}
    parts = [f"{card['name']} {card.get('mana_cost', '')}".strip()]

    if card.get("type_line"):
        parts.append(card["type_line"])

    ci = card.get("color_identity", [])
    if ci:
        parts.append("Color identity: " + ", ".join(color_names.get(c, c) for c in ci))
    else:
        parts.append("Color identity: Colorless")

    if card.get("oracle_text"):
        parts.append(card["oracle_text"])

    keywords = card.get("keywords", [])
    if keywords:
        parts.append("Keywords: " + ", ".join(keywords))

    power = card.get("power")
    toughness = card.get("toughness")
    if power is not None and toughness is not None:
        parts.append(f"Power/Toughness: {power}/{toughness}")

    return " — ".join(parts)


async def embed_batch_openai(texts: list[str]) -> list[list[float]] | None:
    attempt = 0
    while True:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    json={"model": settings.openai_embedding_model, "input": texts, "dimensions": 768},
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                )
                if resp.status_code == 429:
                    wait = int(resp.headers.get("retry-after", min(2 ** attempt * 2, 60)))
                    print(f"\nRate limited — waiting {wait}s...")
                    await asyncio.sleep(wait)
                    attempt += 1
                    continue
                resp.raise_for_status()
                items = sorted(resp.json()["data"], key=lambda x: x["index"])
                return [item["embedding"] for item in items]
        except httpx.HTTPStatusError as e:
            if e.response.status_code < 500:
                raise  # 4xx (except 429 handled above) — not retryable
            wait = min(2 ** attempt * 2, 60)
            print(f"\nServer error {e.response.status_code} — retrying in {wait}s...")
            await asyncio.sleep(wait)
            attempt += 1
        except Exception as e:
            wait = min(2 ** attempt * 2, 60)
            print(f"\nTransient error ({e}) — retrying in {wait}s...")
            await asyncio.sleep(wait)
            attempt += 1


async def embed_batch_ollama(texts: list[str], client: httpx.AsyncClient) -> list[list[float]] | None:
    try:
        resp = await client.post("/api/embed", json={
            "model": settings.ollama_embedding_model,
            "input": texts,
        })
        resp.raise_for_status()
        return resp.json()["embeddings"]
    except Exception as e:
        print(f"Ollama embedding error: {e}")
        return None


async def main() -> None:
    if not CARD_INDEX.exists():
        print(f"Card index not found at {CARD_INDEX}. Run fetch_scryfall.py first.")
        return

    provider = settings.embedding_provider
    print(f"Embedding provider: {provider}")

    if provider == "openai" and not settings.openai_api_key:
        print("OPENAI_API_KEY is not set. Add it to .env or set EMBEDDING_PROVIDER=ollama.")
        return

    print(f"Loading cards from {CARD_INDEX}...")
    card_index: dict = json.loads(CARD_INDEX.read_text())
    cards = list(card_index.values())
    print(f"{len(cards)} cards loaded.")

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ollama_client = None
    if provider == "ollama":
        ollama_client = httpx.AsyncClient(base_url=settings.ollama_base_url, timeout=60.0)
        try:
            await ollama_client.post("/api/embed", json={"model": settings.ollama_embedding_model, "input": "test"})
        except Exception as e:
            print(f"Cannot reach Ollama at {settings.ollama_base_url}: {e}")
            await ollama_client.aclose()
            return

    # Clear existing embeddings in its own session
    async with _Session() as db:
        await db.execute(delete(CardEmbedding))
        await db.commit()

    total_batches = (len(cards) + BATCH_SIZE - 1) // BATCH_SIZE
    with tqdm(total=len(cards), desc="Embedding cards") as bar:
        for i in range(0, len(cards), BATCH_SIZE):
            batch = cards[i : i + BATCH_SIZE]
            texts = [_card_text(c) for c in batch]

            if provider == "ollama" and ollama_client:
                embeddings = await embed_batch_ollama(texts, ollama_client)
            else:
                embeddings = await embed_batch_openai(texts)

            if embeddings is None:
                print(f"Skipping batch {i // BATCH_SIZE + 1}/{total_batches}")
                bar.update(len(batch))
                continue

            if provider == "openai":
                await asyncio.sleep(0.25)

            rows = [
                CardEmbedding(
                    card_name=batch[j]["name"],
                    card_text=texts[j],
                    embedding=embeddings[j],
                )
                for j in range(len(batch))
                if len(embeddings[j]) == EMBEDDING_DIM
            ]
            # Fresh session per batch — avoids long-lived connection drops on remote DBs
            async with _Session() as db:
                db.add_all(rows)
                await db.commit()
            bar.update(len(batch))

    if ollama_client:
        await ollama_client.aclose()

    print("Done. Cards embedded and stored in the database.")


if __name__ == "__main__":
    asyncio.run(main())
