"""LLM inference — Claude API (production) or Ollama (local dev)."""
from __future__ import annotations
import anthropic
import httpx
from app.config import settings

_anthropic_client: anthropic.AsyncAnthropic | None = None

SYSTEM_PROMPT = (
    "You are an expert Magic: The Gathering player and deck builder specializing in "
    "the Commander/EDH format. You provide detailed, thoughtful advice for building "
    "and improving decks, considering card synergies, mana curve, win conditions, "
    "and budget constraints."
)


def _get_anthropic_client() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic()
    return _anthropic_client


async def _respond_claude(system: str, history: list[dict]) -> str:
    client = _get_anthropic_client()
    async with client.messages.stream(
        model=settings.model_name,
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=history,
    ) as stream:
        response = await stream.get_final_message()
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

    if settings.ollama_model:
        try:
            return await _respond_openai_compat(
                settings.ollama_base_url, "", settings.ollama_model, system, history,
                chat_path="/v1/chat/completions",
            )
        except Exception as e:
            return f"Ollama error ({settings.ollama_base_url}): {e}"

    if settings.free_model and settings.free_api_base_url:
        try:
            return await _respond_openai_compat(
                settings.free_api_base_url, settings.free_api_key, settings.free_model, system, history,
                chat_path="/chat/completions",
            )
        except Exception as e:
            return f"Free API error ({settings.free_api_base_url}): {e}"

    if not settings.anthropic_api_key:
        return (
            "No LLM configured. Set ANTHROPIC_API_KEY for Claude, "
            "FREE_MODEL + FREE_API_BASE_URL for a free provider (e.g. GitHub Models), "
            "or OLLAMA_MODEL for local inference."
        )

    try:
        return await _respond_claude(system, history)
    except anthropic.AuthenticationError:
        return "Invalid ANTHROPIC_API_KEY. Check your .env file."
    except Exception as e:
        return f"Error calling Claude API: {e}"
