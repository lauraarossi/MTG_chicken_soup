"""RAG retrieval — Scryfall card lookup + pgvector similarity search."""
from __future__ import annotations
import re
import time
import httpx
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.card_embedding import CardEmbedding

# ── Scryfall card lookup ──────────────────────────────────────────────────────

SCRYFALL_NAMED = "https://api.scryfall.com/cards/named"
SCRYFALL_SEARCH = "https://api.scryfall.com/cards/search"
SCRYFALL_CATALOG = "https://api.scryfall.com/catalog/card-names"
SCRYFALL_HEADERS = {"Accept": "application/json", "User-Agent": "MTGChickenSoup/1.0"}

# Common words that are not card names — filtered for single-word n-gram matches only
_STOPWORDS_LOWER = frozenset({
    "the", "this", "that", "these", "those", "what", "when", "where", "how",
    "why", "which", "who", "can", "could", "would", "should", "will", "does",
    "do", "is", "are", "was", "were", "have", "has", "had", "make", "build",
    "want", "need", "help", "tell", "show", "give", "let", "get", "put", "use",
    "commander", "standard", "modern", "legacy", "vintage", "pioneer", "draft",
    "sealed", "pauper", "explorer", "historic", "brawl", "magic", "mtg", "edh",
    "deck", "card", "cards", "format", "strategy", "synergy", "win", "play",
    "turn", "mana", "land", "lands", "spell", "spells", "creature", "creatures",
    "artifact", "enchantment", "instant", "sorcery", "planeswalker", "token",
    "also", "just", "very", "really", "good", "best", "great", "strong", "okay",
    "and", "or", "but", "with", "for", "my", "your", "its", "our", "their",
    "i", "a", "an", "in", "on", "at", "of", "to", "it",
})

# Catalog cache: lowercase name → canonical Scryfall name
_card_name_index: dict[str, str] | None = None
_catalog_fetched_at: float = 0.0
_CATALOG_TTL = 86400.0  # refresh once per day


async def _get_card_name_index() -> dict[str, str]:
    global _card_name_index, _catalog_fetched_at
    now = time.monotonic()
    if _card_name_index is None or now - _catalog_fetched_at > _CATALOG_TTL:
        async with httpx.AsyncClient(timeout=15.0, headers=SCRYFALL_HEADERS) as client:
            r = await client.get(SCRYFALL_CATALOG)
            r.raise_for_status()
            names: list[str] = r.json()["data"]
        _card_name_index = {n.lower(): n for n in names}
        _catalog_fetched_at = now
    return _card_name_index


async def _extract_candidates(query: str) -> list[str]:
    """Find card name candidates in query text using Scryfall catalog n-gram matching."""
    index = await _get_card_name_index()
    candidates: list[str] = []

    # Quoted text is highest confidence — add directly
    for m in re.finditer(r'["""]([^"""]{2,60})["""]', query):
        candidates.append(m.group(1).strip())

    # Tokenise the query and match n-grams (1–5 words) against the full card catalog
    words = re.findall(r"[\w'''\-]+", query.lower())
    spans: list[tuple[int, int, str]] = []  # (start, end, canonical_name)

    for n in range(min(5, len(words)), 0, -1):
        for i in range(len(words) - n + 1):
            gram = " ".join(words[i : i + n])
            if gram not in index:
                continue
            # Skip common non-card words for single-token matches
            if n == 1 and gram in _STOPWORDS_LOWER:
                continue
            # Skip if this span is already covered by a longer match
            if any(s <= i and i + n <= e for s, e, _ in spans):
                continue
            spans.append((i, i + n, index[gram]))

    quoted_lower = {c.lower() for c in candidates}
    for _, _, name in spans:
        if name.lower() not in quoted_lower:
            candidates.append(name)

    return candidates[:8]


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
    candidates = await _extract_candidates(query)
    if not candidates:
        return None

    cards: dict[str, dict] = {}  # name → card object
    ambiguous: list[str] = []    # candidate names that matched multiple cards

    async with httpx.AsyncClient(timeout=5.0, headers=SCRYFALL_HEADERS) as client:
        for candidate in candidates[:6]:
            try:
                # Fuzzy match — finds "Ghalta and Mavren" from "ghalta and mavren"
                r = await client.get(SCRYFALL_NAMED, params={"fuzzy": candidate})
                fuzzy_name = None
                if r.status_code == 200:
                    card = r.json()
                    cards[card["name"]] = card
                    fuzzy_name = card["name"]

                # For short candidates, also search for all cards sharing the name
                # so "Ghalta" surfaces Primal Hunger, Stampede Tyrant, and Mavren together
                if len(candidate.split()) <= 2:
                    sr = await client.get(
                        SCRYFALL_SEARCH,
                        params={"q": f'name:"{candidate}"', "order": "edhrec", "unique": "cards"},
                    )
                    if sr.status_code == 200:
                        matches = sr.json().get("data", [])[:4]
                        for c in matches:
                            cards.setdefault(c["name"], c)
                        # Flag as ambiguous if search returned multiple distinct cards
                        distinct = [c["name"] for c in matches if c["name"] != fuzzy_name]
                        if distinct:
                            ambiguous.append(candidate)

            except Exception:
                continue

    if not cards:
        return None

    card_blocks = "\n\n".join(_format_card(c) for c in list(cards.values())[:8])
    context = "The following card data is from Scryfall — treat it as ground truth:\n\n" + card_blocks

    if ambiguous:
        names = ", ".join(f'"{a}"' for a in ambiguous)
        context += (
            f"\n\n⚠️ AMBIGUOUS CARD NAME(S): {names} matched multiple different cards (all shown above). "
            "You MUST ask the user which card they mean before proceeding."
        )

    return context


# ── pgvector similarity search ────────────────────────────────────────────────

async def _embed_openai(text: str) -> list[float] | None:
    if not settings.openai_api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/embeddings",
                json={"model": settings.openai_embedding_model, "input": text, "dimensions": 768},
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
    except Exception:
        return None


async def _embed_ollama(text: str) -> list[float] | None:
    try:
        async with httpx.AsyncClient(base_url=settings.ollama_base_url, timeout=30.0) as client:
            resp = await client.post("/api/embed", json={
                "model": settings.ollama_embedding_model,
                "input": text,
            })
            resp.raise_for_status()
            return resp.json()["embeddings"][0]
    except Exception:
        return None


async def _embed(text: str) -> list[float] | None:
    if settings.embedding_provider == "ollama":
        return await _embed_ollama(text)
    return await _embed_openai(text)


_COMMANDER_WORDS = frozenset({"commander", "edh", "brawl"})

_DECK_BUILD_WORDS = frozenset({
    "build", "deck", "want", "make", "create", "suggest", "recommend",
    "tribal", "aggro", "control", "midrange", "combo", "ramp", "tempo",
    "standard", "pioneer", "modern", "legacy", "vintage", "pauper", "explorer", "historic",
    "draft", "sealed", "include", "run",
})

# Tribe/creature-type names that signal card discovery even without "deck" keyword
_TRIBE_WORDS = frozenset({
    "pirates", "elves", "goblins", "zombies", "dragons", "angels", "humans", "merfolk",
    "vampires", "soldiers", "wizards", "rogues", "warriors", "clerics", "shamans",
    "spirits", "beasts", "demons", "knights", "slivers", "faeries", "elementals",
})

# Discovery intent: looking for a set of cards rather than asking about specific ones
_DISCOVERY_WORDS = frozenset({
    "what", "which", "find", "show", "list", "any", "all", "best", "good", "top",
})

_CARD_TYPE_WORDS = frozenset({
    "cards", "card", "spells", "creatures", "artifacts", "enchantments",
    "instants", "sorceries", "lands", "planeswalkers",
})

# Pure rules/mechanics signals — no card pool needed to answer these
_RULES_WORDS = frozenset({
    "stack", "priority", "resolve", "resolution", "triggered", "trigger",
    "layer", "replacement", "state-based", "phase", "step", "combat",
    "upkeep", "sba", "priority", "targeting",
})


def _estimate_k(query: str) -> int:
    words = set(re.findall(r"\w+", query.lower()))

    # Commander deck building — needs the widest card pool
    if words & _COMMANDER_WORDS and words & (_DECK_BUILD_WORDS | {"around", "for", "with"}):
        return 40

    # Non-commander deck building
    if words & _DECK_BUILD_WORDS:
        return 25

    # Card discovery: "what dragons are not red", "which cards deal damage to all creatures"
    if words & _DISCOVERY_WORDS and words & (_CARD_TYPE_WORDS | _TRIBE_WORDS):
        return 20

    # Pure rules/mechanics with no card-discovery intent — no vector context needed
    if words & _RULES_WORDS and not words & _DISCOVERY_WORDS:
        return 0

    # Default: small amount of context for specific card questions, comparisons, etc.
    return 6


async def get_relevant_cards(query: str, db: AsyncSession, k: int | None = None) -> str | None:
    """Return a formatted context string of the k most relevant cards via hybrid (vector + FTS) search."""
    if k is None:
        k = _estimate_k(query)
    if k == 0:
        return None
    count = await db.scalar(select(func.count()).select_from(CardEmbedding))
    if not count:
        return None

    pool = k * 3  # each method fetches a wider pool; RRF trims to k

    # --- Vector search ---
    vector_names: list[str] = []
    card_texts: dict[str, str] = {}

    query_vec = await _embed(query)
    if query_vec is not None:
        rows = (await db.execute(
            select(CardEmbedding)
            .order_by(CardEmbedding.embedding.cosine_distance(query_vec))
            .limit(pool)
        )).scalars().all()
        vector_names = [r.card_name for r in rows]
        card_texts.update({r.card_name: r.card_text for r in rows})

    # --- Full-text search ---
    fts_names: list[str] = []
    try:
        fts_rows = (await db.execute(
            text("""
                SELECT card_name, card_text
                FROM card_embeddings
                WHERE search_vec @@ plainto_tsquery('english', :q)
                ORDER BY ts_rank(search_vec, plainto_tsquery('english', :q)) DESC
                LIMIT :lim
            """),
            {"q": query, "lim": pool},
        )).fetchall()
        fts_names = [r.card_name for r in fts_rows]
        card_texts.update({r.card_name: r.card_text for r in fts_rows})
    except Exception:
        pass  # column not yet migrated or query parse error — degrade to vector-only

    if not vector_names and not fts_names:
        return None

    # --- Reciprocal Rank Fusion (k=60) ---
    K_RRF = 60
    scores: dict[str, float] = {}
    for rank, name in enumerate(vector_names, 1):
        scores[name] = scores.get(name, 0.0) + 1.0 / (K_RRF + rank)
    for rank, name in enumerate(fts_names, 1):
        scores[name] = scores.get(name, 0.0) + 1.0 / (K_RRF + rank)

    top_names = sorted(scores, key=lambda n: scores[n], reverse=True)[:k]

    lines = ["**Related cards (hybrid search):**"]
    for name in top_names:
        lines.append(f"- {card_texts[name]}")
    return "\n".join(lines)
