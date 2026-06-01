"""RAG retrieval — finds cards relevant to the user's query via pgvector similarity search."""
from __future__ import annotations
import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.card_embedding import CardEmbedding


async def _embed(text: str) -> list[float] | None:
    try:
        async with httpx.AsyncClient(base_url=settings.ollama_base_url, timeout=30.0) as client:
            resp = await client.post("/api/embed", json={
                "model": settings.embedding_model,
                "input": text,
            })
            resp.raise_for_status()
            return resp.json()["embeddings"][0]
    except Exception:
        return None


async def get_relevant_cards(query: str, db: AsyncSession, k: int = 6) -> str | None:
    """Return a formatted context string of the k most relevant cards, or None if unavailable."""
    # Check whether any embeddings exist first (zero-cost if table is empty)
    count = await db.scalar(select(func.count()).select_from(CardEmbedding))
    if not count:
        return None

    query_vec = await _embed(query)
    if query_vec is None:
        return None

    rows = (await db.execute(
        select(CardEmbedding)
        .order_by(CardEmbedding.embedding.cosine_distance(query_vec))
        .limit(k)
    )).scalars().all()

    if not rows:
        return None

    lines = ["**Potentially relevant cards:**"]
    for row in rows:
        lines.append(f"- {row.card_text}")
    return "\n".join(lines)
