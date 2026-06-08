"""LLM inference — supports Claude API, any OpenAI-compatible API, and Ollama."""
from __future__ import annotations
import json
import anthropic
import httpx
from app.config import settings

_anthropic_client: anthropic.AsyncAnthropic | None = None

BASE_PROMPT = (
    "You are an expert Magic: The Gathering player with deep knowledge of all formats: "
    "Commander/EDH, Brawl, Standard, Pioneer, Modern, Legacy, Vintage, Pauper, Explorer, Historic, "
    "and limited formats (Draft and Sealed). "
    "Give specific, actionable advice. Never pad responses with generic theory when you can give "
    "concrete card names, synergies, or strategies instead. "
    "When card data from Scryfall is provided in the context, treat it as ground truth — "
    "use the exact oracle text, type line, and mana cost provided, and do not correct or contradict it "
    "even if it differs from your training data. "
    "If the context flags a card name as ambiguous (multiple cards match), you MUST stop and ask "
    "the user which card they mean before giving any advice. Never assume or pick one silently. "
    "When a 'Related cards (semantic search)' block appears in the context, treat those as a "
    "pre-screened candidate pool — draw from them first before reaching into general training knowledge. "
    "When recommending cards for a deck, briefly justify each suggestion (one sentence) — "
    "explain why it fits the strategy, not just what it does."
)

FORMAT_PROMPTS: dict[str, str] = {
    "rules": (
        "You are a Magic: The Gathering rules advisor. "
        "Answer rules questions, explain terminology, and clarify interactions precisely. "
        "Cover mechanics like the stack, priority, layers, state-based actions, replacement effects, "
        "triggered vs activated abilities, and so on — at whatever depth the question requires. "
        "Cite the relevant Comprehensive Rules section number when it helps clarity. "
        "If the user has saved decks (provided in context), feel free to reference them when relevant, "
        "but do not assume the question is about deck building unless they ask."
    ),
    "limited": (
        "You are advising on a specific limited format (Draft or Sealed). "
        "Your response MUST be specific to the set being discussed — do not give generic limited theory. "
        "Cover: the set's key mechanics and how they shape gameplay, the exact archetype(s) the chosen "
        "colours support in THIS set, the best commons and uncommons in those colours, what the archetype "
        "is trying to do (aggro/tempo/midrange/control), key synergies to build around, and what to "
        "avoid or deprioritise. "
        "If the set is beyond your knowledge cutoff, say so clearly rather than inventing card names — "
        "but still discuss the colour pair's tendencies and ask the user to share key mechanics."
    ),
    "commander": (
        "You are advising on a Commander or Brawl deck. "
        "Focus on the specific commander's abilities and how the 99 supports them. "
        "Account for the multiplayer (typically 4-player) context: prioritise high-impact spells, "
        "efficient card advantage, interaction that scales to multiple opponents, and clear win conditions. "
        "Discuss colour identity constraints, the commander's power level, and budget tiers if relevant."
    ),
    "standard": (
        "You are advising on a Standard deck. "
        "Focus on the current legal card pool and discuss rotation risk for recently printed cards. "
        "Cover the archetype's meta positioning, key synergies, mana base, and sideboard priorities."
    ),
    "pioneer": (
        "You are advising on a Pioneer deck. "
        "Pioneer has no rotation — leverage the deep card pool and established meta archetypes. "
        "Discuss synergies, mana base options, and sideboard strategy against the major meta threats."
    ),
    "modern": (
        "You are advising on a Modern deck. "
        "Modern is a high-power format where efficiency is paramount. "
        "Discuss the deck's speed relative to the meta, key combo lines or threat density, "
        "critical interaction, and sideboard strategy for the major threats."
    ),
    "legacy": (
        "You are advising on a Legacy deck. "
        "Legacy includes Force of Will, dual lands, and a near-complete card pool. "
        "Focus on the deck's positioning against blue permission and fast combo. "
        "Mana efficiency and interaction density are critical."
    ),
    "vintage": (
        "You are advising on a Vintage deck. "
        "Vintage is the most powerful format — Power Nine and almost all cards are legal. "
        "Focus on broken interactions, fast mana, and early-turn wins or disruption. "
        "Reference the restriction list where relevant."
    ),
    "pauper": (
        "You are advising on a Pauper deck. "
        "Pauper is commons-only — restrict ALL card suggestions to cards printed at common rarity. "
        "The format has well-established archetypes; discuss where the chosen strategy fits "
        "and the key commons that define the current meta."
    ),
    "explorer": (
        "You are advising on an Explorer deck (Pioneer-legal cards on MTG Arena). "
        "Note any Pioneer staples not yet available on Arena and suggest Arena-legal alternatives."
    ),
    "historic": (
        "You are advising on a Historic deck (MTG Arena format with expanded card pool). "
        "The card pool includes Historic Anthologies, Remastered sets, and some non-Pioneer cards. "
        "Focus on powerful synergies available in this unique card pool."
    ),
    "general": (
        "Answer the specific question clearly and directly. "
        "If the user wants to build a deck without specifying a format, treat it as casual 60-card "
        "or ask one focused question to clarify (format, power level, or budget) before diving in. "
        "When recommending cards, draw first from any 'Related cards' context provided."
    ),
}


def _detect_format(history: list[dict], context: str | None = None) -> str:
    # Allow the caller to pin the format via a sentinel in system_context
    if context and context.startswith("FORMAT:"):
        return context.split("\n")[0].removeprefix("FORMAT:").strip().lower()
    first_msg = next(
        (m["content"].lower() for m in history if m["role"] == "user"), ""
    )
    if any(w in first_msg for w in ["draft", "sealed", "limited"]):
        return "limited"
    if any(w in first_msg for w in ["commander", "edh", "brawl"]):
        return "commander"
    if "vintage" in first_msg:
        return "vintage"
    if "legacy" in first_msg:
        return "legacy"
    if "modern" in first_msg:
        return "modern"
    if "pioneer" in first_msg:
        return "pioneer"
    if "explorer" in first_msg:
        return "explorer"
    if "historic" in first_msg:
        return "historic"
    if "pauper" in first_msg:
        return "pauper"
    if "standard" in first_msg:
        return "standard"
    return "general"


def build_system_prompt(history: list[dict], context: str | None = None) -> str:
    fmt = _detect_format(history, context)
    addendum = FORMAT_PROMPTS.get(fmt, "")
    # Strip the FORMAT: sentinel line before appending context to the prompt
    clean_context = (
        "\n".join(context.splitlines()[1:]).strip()
        if context and context.startswith("FORMAT:")
        else context
    )
    parts = [BASE_PROMPT]
    if addendum:
        parts.append(addendum)
    if clean_context:
        parts.append(clean_context)
    return "\n\n".join(parts)


_DEFAULT_ORDER = ["ollama", "free", "claude"]


def _get_anthropic_client() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic()
    return _anthropic_client


async def _respond_claude(system: str, history: list[dict]) -> str:
    client = _get_anthropic_client()
    response = await client.messages.create(
        model=settings.model_name,
        max_tokens=4096,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=history,
    )
    return next(
        (b.text for b in response.content if b.type == "text"),
        "I couldn't generate a response. Please try again.",
    )


async def _respond_openai_compat(
    base_url: str, api_key: str, model: str, system: str, history: list[dict],
    chat_path: str = "/v1/chat/completions",
) -> str:
    messages = [{"role": "system", "content": system}] + history
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    async with httpx.AsyncClient(base_url=base_url, timeout=120.0) as client:
        resp = await client.post(
            chat_path,
            json={"model": model, "messages": messages, "stream": False, "max_tokens": 4096},
            headers=headers,
        )
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise httpx.HTTPStatusError(
                f"{e.response.status_code} {e.response.reason_phrase}: {e.response.text}",
                request=e.request,
                response=e.response,
            )
    return resp.json()["choices"][0]["message"]["content"]


async def get_response(
    message: str, history: list[dict], context: str | None = None
) -> str:
    system = build_system_prompt(history, context)

    preferred = settings.inference_provider.lower() if settings.inference_provider else ""
    if preferred in _DEFAULT_ORDER:
        order = [preferred] + [p for p in _DEFAULT_ORDER if p != preferred]
    else:
        order = _DEFAULT_ORDER

    for provider in order:
        if provider == "ollama" and settings.ollama_model:
            try:
                return await _respond_openai_compat(
                    settings.ollama_base_url, "", settings.ollama_model, system, history,
                    chat_path="/v1/chat/completions",
                )
            except Exception as e:
                return f"Ollama error ({settings.ollama_base_url}): {e}"

        elif provider == "free" and settings.free_model and settings.free_api_base_url:
            try:
                return await _respond_openai_compat(
                    settings.free_api_base_url, settings.free_api_key, settings.free_model, system, history,
                    chat_path="/chat/completions",
                )
            except Exception as e:
                return f"Free API error ({settings.free_api_base_url}): {e}"

        elif provider == "claude" and settings.anthropic_api_key:
            try:
                return await _respond_claude(system, history)
            except anthropic.AuthenticationError:
                return "Invalid ANTHROPIC_API_KEY. Check your environment variables."
            except Exception as e:
                return f"Error calling Claude API: {e}"

    return (
        "No LLM configured. Set ANTHROPIC_API_KEY for Claude, "
        "FREE_MODEL + FREE_API_BASE_URL for a free provider, "
        "or OLLAMA_MODEL for local inference."
    )


# ── Streaming variants ────────────────────────────────────────────────────────

async def _stream_claude(system: str, history: list[dict]):
    client = _get_anthropic_client()
    async with client.messages.stream(
        model=settings.model_name,
        max_tokens=4096,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=history,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _stream_openai_compat(
    base_url: str, api_key: str, model: str, system: str, history: list[dict],
    chat_path: str = "/v1/chat/completions",
):
    messages = [{"role": "system", "content": system}] + history
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    async with httpx.AsyncClient(base_url=base_url, timeout=120.0) as client:
        async with client.stream(
            "POST",
            chat_path,
            json={"model": model, "messages": messages, "stream": True, "max_tokens": 4096},
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    return
                try:
                    token = json.loads(data)["choices"][0]["delta"].get("content", "")
                    if token:
                        yield token
                except Exception:
                    continue


async def stream_response(message: str, history: list[dict], context: str | None = None):
    """Async generator that yields text chunks from the configured LLM provider."""
    system = build_system_prompt(history, context)
    preferred = settings.inference_provider.lower() if settings.inference_provider else ""
    order = [preferred] + [p for p in _DEFAULT_ORDER if p != preferred] if preferred in _DEFAULT_ORDER else _DEFAULT_ORDER

    for provider in order:
        if provider == "ollama" and settings.ollama_model:
            async for chunk in _stream_openai_compat(
                settings.ollama_base_url, "", settings.ollama_model, system, history,
            ):
                yield chunk
            return
        elif provider == "free" and settings.free_model and settings.free_api_base_url:
            async for chunk in _stream_openai_compat(
                settings.free_api_base_url, settings.free_api_key, settings.free_model, system, history,
                chat_path="/chat/completions",
            ):
                yield chunk
            return
        elif provider == "claude" and settings.anthropic_api_key:
            async for chunk in _stream_claude(system, history):
                yield chunk
            return

    yield "No LLM configured. Set ANTHROPIC_API_KEY, FREE_MODEL + FREE_API_BASE_URL, or OLLAMA_MODEL."
