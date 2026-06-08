"""Public deck-builder API — POST /api/v1/deck.

Authentication: pass a valid key in the X-API-Key header.
Keys are configured via V1_API_KEYS in .env (comma-separated).
"""
from __future__ import annotations
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.ml.inference import get_response
from app.ml.rag import get_relevant_cards, lookup_cards_in_query

router = APIRouter(prefix="/v1", tags=["Public API v1"])

COMMANDER_FORMATS = frozenset({"commander", "brawl"})
VALID_FORMATS = frozenset({
    "commander", "brawl", "standard", "pioneer", "modern",
    "legacy", "vintage", "pauper", "explorer", "historic",
    "draft", "sealed",
})

EXTRACT_PROMPT = (
    "Based on the deck above, output the complete decklist in plain text. "
    "One card per line using the format: '1 Card Name' where the number is the quantity. "
    "Never use numbered list format (e.g. '1.' or '2.') — the leading number is the copy count only. "
    "Separate each section with a blank line and prefix each section header with //. "
    "For Commander/Brawl, list the commander(s) first under '// Commander'. "
    "Then group remaining cards under these headers (only include sections that have cards): "
    "// Creature, // Planeswalker, // Battle, // Instant, // Sorcery, // Artifact, // Enchantment, // Land, // Other. "
    "Return ONLY the formatted decklist — no introduction, explanation, or closing remarks."
)

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)


async def _verify_api_key(key: str = Security(_api_key_header)) -> str:
    valid = {k.strip() for k in settings.v1_api_keys.split(",") if k.strip()}
    if not valid:
        raise HTTPException(status_code=503, detail="Public API not enabled on this instance.")
    if key not in valid:
        raise HTTPException(status_code=403, detail="Invalid API key.")
    return key


class DeckBuildRequest(BaseModel):
    format: str
    """MTG format. Required. One of: commander, brawl, standard, pioneer, modern, legacy,
    vintage, pauper, explorer, historic, draft, sealed."""

    commander: str | None = None
    """Commander card name. Required for commander/brawl formats, ignored otherwise."""

    prompt: str | None = None
    """Free-text description of the deck you want. Required when no commander is provided.
    Examples: 'aggressive red-green ramp', 'pirate tribal with lots of treasure'."""

    @model_validator(mode="after")
    def validate_fields(self) -> "DeckBuildRequest":
        fmt = self.format.lower()
        if fmt not in VALID_FORMATS:
            raise ValueError(f"format must be one of: {', '.join(sorted(VALID_FORMATS))}")
        self.format = fmt
        if fmt in COMMANDER_FORMATS and not self.commander:
            raise ValueError("commander is required for commander/brawl format.")
        if not self.commander and not self.prompt:
            raise ValueError("prompt is required when commander is not provided.")
        return self


class DeckBuildResponse(BaseModel):
    decklist: str
    """Complete deck in MTG-standard format: '1 Card Name' per line, grouped under // Section headers."""

    format: str
    """The format that was used to build this deck."""


@router.post(
    "/deck",
    response_model=DeckBuildResponse,
    summary="Build a deck",
    description=(
        "Generate a complete MTG deck for the specified format. "
        "Returns a formatted decklist ready to import into any deck editor."
    ),
)
async def build_deck(
    request: DeckBuildRequest,
    db: AsyncSession = Depends(get_db),
    _key: str = Security(_verify_api_key),
) -> DeckBuildResponse:
    # Compose the initial user message
    parts = [f"Build a complete {request.format} deck."]
    if request.commander:
        parts.append(f"Commander: {request.commander}.")
    if request.prompt:
        parts.append(request.prompt)
    user_message = " ".join(parts)

    # Prepend the format sentinel so inference picks the right system prompt addendum
    system_context = f"FORMAT:{request.format}\n"

    # RAG — card lookup + vector search
    try:
        card_context = await lookup_cards_in_query(user_message)
    except Exception:
        card_context = None
    try:
        vector_context = await get_relevant_cards(user_message, db)
    except Exception:
        vector_context = None

    context_parts = [p for p in [system_context, card_context, vector_context] if p]
    context = "\n\n".join(context_parts) or None

    history = [{"role": "user", "content": user_message}]

    # First pass: generate the deck
    deck_response = await get_response(user_message, history, context=context)

    # Second pass: extract a clean decklist
    extract_history = history + [
        {"role": "assistant", "content": deck_response},
        {"role": "user", "content": EXTRACT_PROMPT},
    ]
    decklist = await get_response(EXTRACT_PROMPT, extract_history)

    return DeckBuildResponse(decklist=decklist.strip(), format=request.format)
