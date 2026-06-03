"""RAG retrieval — Scryfall card lookup + pgvector similarity search."""
from __future__ import annotations
import re
import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.card_embedding import CardEmbedding

# ── Scryfall card lookup ──────────────────────────────────────────────────────

SCRYFALL_NAMED = "https://api.scryfall.com/cards/named"
SCRYFALL_SEARCH = "https://api.scryfall.com/cards/search"
SCRYFALL_HEADERS = {"Accept": "application/json", "User-Agent": "MTGChickenSoup/1.0"}

# Words that look like card names but aren't
_STOPWORDS = frozenset({
    "The", "This", "That", "These", "Those", "What", "When", "Where", "How",
    "Why", "Which", "Who", "Can", "Could", "Would", "Should", "Will", "Does",
    "Do", "Is", "Are", "Was", "Were", "Have", "Has", "Had", "Make", "Build",
    "Want", "Need", "Help", "Tell", "Show", "Give", "Let", "Get", "Put", "Use",
    "Commander", "Standard", "Modern", "Legacy", "Vintage", "Pioneer", "Draft",
    "Sealed", "Pauper", "Explorer", "Historic", "Brawl", "Magic", "MTG", "EDH",
    "Deck", "Card", "Cards", "Format", "Strategy", "Synergy", "Win", "Play",
    "Turn", "Mana", "Land", "Lands", "Spell", "Spells", "Creature", "Creatures",
    "Artifact", "Enchantment", "Instant", "Sorcery", "Planeswalker", "Token",
    "Also", "Just", "Very", "Really", "Good", "Best", "Great", "Strong", "Okay",
})

# Matches Title Case phrases, including connectors like "and", "of", "to", "the"
_CARD_NAME_RE = re.compile(
    r'\b([A-Z][a-zA-Z\'\-]+'
    r'(?:'
    r'(?:,?\s+(?:and|of|the|a|an|to|from|into|with)\s+[A-Z][a-zA-Z\'\-]+)'
    r'|(?:\s+[A-Z][a-zA-Z\'\-]+)'
    r'){0,4})'
    r'\b'
)


def _extract_candidates(query: str) -> list[str]:
    candidates: list[str] = []

    # Quoted text is almost certainly a card name
    for m in re.finditer(r'["“”]([^"“”]{2,60})["“”]', query):
        candidates.append(m.group(1).strip())

    # Title Case phrases
    for m in _CARD_NAME_RE.finditer(query):
        phrase = m.group(1).strip(" ,")
        if phrase not in _STOPWORDS and len(phrase) > 2:
            candidates.append(phrase)

    # Deduplicate; prefer longer phrases so "Ghalta and Mavren" wins over "Ghalta"
    seen: set[str] = set()
    result: list[str] = []
    for c in sorted(candidates, key=len, reverse=True):
        lower = c.lower()
        if not any(lower in existing for existing in seen):
            seen.add(lower)
            result.append(c)

    return result[:8]


def _get_oracle_text(card: dict) -> str:
    if card.get("oracle_text"):
        return card["oracle_text"]
    faces = card.get("card_faces", [])
    return " // ".join(f.get("oracle_text", "") for f in faces if f.get("oracle_text"))


def _format_card(card: dict) -> str:
    color_names = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}
    parts = [f"**{card['name']}**"]

    mana = card.get("mana_cost") or " // ".join(
        f.get("mana_cost", "") for f in card.get("card_faces", []) if f.get("mana_cost")
    )
    if mana:
        parts.append(f"Mana cost: {mana}")

    parts.append(f"Type: {card.get('type_line', '')}")

    colors = card.get("colors") or card.get("color_identity", [])
    if colors:
        parts.append(f"Colors: {', '.join(color_names.get(c, c) for c in colors)}")

    oracle = _get_oracle_text(card)
    if oracle:
        parts.append(f"Rules text: {oracle}")

    if card.get("power") is not None:
        parts.append(f"Power/Toughness: {card['power']}/{card['toughness']}")
    if card.get("loyalty"):
        parts.append(f"Loyalty: {card['loyalty']}")

    return "\n".join(parts)


async def lookup_cards_in_query(query: str) -> str | None:
    """
    Detect card name candidates in the query, fetch them from Scryfall, and
    return formatted oracle data for context injection.

    For partial names (e.g. "Ghalta"), returns all matching cards so the model
    can distinguish between them or ask the user to clarify.
    """
    candidates = _extract_candidates(query)
    if not candidates:
        return None

    cards: dict[str, dict] = {}  # name → card object

    async with httpx.AsyncClient(timeout=5.0, headers=SCRYFALL_HEADERS) as client:
        for candidate in candidates[:6]:
            try:
                # Fuzzy match — finds "Ghalta and Mavren" from "ghalta and mavren"
                r = await client.get(SCRYFALL_NAMED, params={"fuzzy": candidate})
                if r.status_code == 200:
                    card = r.json()
                    cards[card["name"]] = card

                # For short candidates, also search for all cards sharing the name
                # so "Ghalta" surfaces Primal Hunger, Stampede Tyrant, and Mavren together
                if len(candidate.split()) <= 2:
                    sr = await client.get(
                        SCRYFALL_SEARCH,
                        params={"q": f'name:"{candidate}"', "order": "edhrec", "unique": "cards"},
                    )
                    if sr.status_code == 200:
                        for c in sr.json().get("data", [])[:4]:
                            cards.setdefault(c["name"], c)

            except Exception:
                continue

    if not cards:
        return None

    card_blocks = "\n\n".join(_format_card(c) for c in list(cards.values())[:8])
    return (
        "The following card data is from Scryfall — treat it as ground truth:\n\n"
        + card_blocks
    )


# ── pgvector similarity search (requires Ollama + embeddings) ────────────────

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
    """Return a formatted context string of the k most relevant cards via vector search."""
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

    lines = ["**Related cards (semantic search):**"]
    for row in rows:
        lines.append(f"- {row.card_text}")
    return "\n".join(lines)
