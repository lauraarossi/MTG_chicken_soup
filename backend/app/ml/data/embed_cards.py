"""Generate and store pgvector embeddings for all Commander-legal cards.

Usage (from the backend/ directory inside Docker or a venv):
    python -m app.ml.data.embed_cards

Requires:
  - Ollama running with the embedding model pulled (default: nomic-embed-text)
  - data/processed/card_index.json (run fetch_scryfall.py first)
  - DATABASE_URL pointing at a pgvector-enabled Postgres
"""
import asyncio
import json
from pathlib import Path

import httpx
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from tqdm import tqdm

from app.config import settings
from app.database import AsyncSessionLocal, engine, Base
from app.models.card_embedding import CardEmbedding, EMBEDDING_DIM

CARD_INDEX = Path("data/processed/card_index.json")
BATCH_SIZE = 32


def _card_text(card: dict) -> str:
    parts = [f"{card['name']} {card.get('mana_cost', '')}".strip()]
    if card.get("type_line"):
        parts.append(card["type_line"])
    if card.get("oracle_text"):
        parts.append(card["oracle_text"])
    return " — ".join(parts)


async def embed_batch(texts: list[str], client: httpx.AsyncClient) -> list[list[float]] | None:
    try:
        resp = await client.post("/api/embed", json={
            "model": settings.embedding_model,
            "input": texts,
        })
        resp.raise_for_status()
        return resp.json()["embeddings"]
    except Exception as e:
        print(f"Embedding error: {e}")
        return None


async def main() -> None:
    if not CARD_INDEX.exists():
        print(f"Card index not found at {CARD_INDEX}. Run fetch_scryfall.py first.")
        return

    print(f"Loading cards from {CARD_INDEX}...")
    card_index: dict = json.loads(CARD_INDEX.read_text())
    cards = list(card_index.values())
    print(f"{len(cards)} cards loaded.")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(base_url=settings.ollama_base_url, timeout=60.0) as client:
        # Verify Ollama is reachable and the model exists
        try:
            await client.post("/api/embed", json={"model": settings.embedding_model, "input": "test"})
        except Exception as e:
            print(f"Cannot reach Ollama at {settings.ollama_base_url}: {e}")
            return

        async with AsyncSessionLocal() as db:
            # Clear existing embeddings before re-generating
            await db.execute(delete(CardEmbedding))
            await db.commit()

            total_batches = (len(cards) + BATCH_SIZE - 1) // BATCH_SIZE
            with tqdm(total=len(cards), desc="Embedding cards") as bar:
                for i in range(0, len(cards), BATCH_SIZE):
                    batch = cards[i : i + BATCH_SIZE]
                    texts = [_card_text(c) for c in batch]

                    embeddings = await embed_batch(texts, client)
                    if embeddings is None:
                        print(f"Skipping batch {i // BATCH_SIZE + 1}/{total_batches}")
                        bar.update(len(batch))
                        continue

                    rows = [
                        CardEmbedding(
                            card_name=batch[j]["name"],
                            card_text=texts[j],
                            embedding=embeddings[j],
                        )
                        for j in range(len(batch))
                        if len(embeddings[j]) == EMBEDDING_DIM
                    ]
                    db.add_all(rows)
                    await db.commit()
                    bar.update(len(batch))

    print("Done. Cards embedded and stored in the database.")


if __name__ == "__main__":
    asyncio.run(main())
