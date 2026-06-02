"""LLM inference — supports Claude API, any OpenAI-compatible API, and Ollama."""
from __future__ import annotations
import anthropic
import httpx
from app.config import settings

_anthropic_client: anthropic.AsyncAnthropic | None = None

SYSTEM_PROMPT = (
    "You are an expert Magic: The Gathering player with deep knowledge of all formats: "
    "Commander/EDH, Brawl, Standard, Pioneer, Modern, Legacy, Vintage, Pauper, Explorer, Historic, "
    "and limited formats (Draft and Sealed). "
    "For constructed formats, you give detailed deck-building advice covering card choices, synergies, "
    "mana curve, win conditions, and budget. "
    "For limited formats, you advise on card evaluation, colour signals, archetype priorities, and "
    "pick order rather than building a fixed 60-card list. "
    "Always tailor your advice to the format the user specifies."
)

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
    system = SYSTEM_PROMPT
    if context:
        system = f"{SYSTEM_PROMPT}\n\n{context}"

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
