"""LLM inference — loads the fine-tuned model if available, otherwise the base model."""
from __future__ import annotations
from app.config import settings

_pipeline = None

SYSTEM_PROMPT = (
    "You are an expert Magic: The Gathering player and deck builder specializing in "
    "the Commander/EDH format. You provide detailed, thoughtful advice for building "
    "and improving decks, considering card synergies, mana curve, win conditions, "
    "and budget constraints."
)


def _load_model():
    global _pipeline
    try:
        import torch
        from transformers import pipeline

        model_path = settings.model_path or settings.model_name
        print(f"Loading model: {model_path}")
        _pipeline = pipeline(
            "text-generation",
            model=model_path,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
        )
        print("Model loaded.")
    except Exception as e:
        print(f"Could not load model: {e}")
        _pipeline = None


async def get_response(message: str, history: list[dict]) -> str:
    global _pipeline
    if _pipeline is None:
        _load_model()

    if _pipeline is None:
        return (
            "The MTG assistant model is not yet loaded. "
            "Run the data pipeline and fine-tuning scripts in backend/app/ml/, "
            "then set MODEL_PATH in your .env file."
        )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    output = _pipeline(
        messages,
        max_new_tokens=512,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        pad_token_id=_pipeline.tokenizer.eos_token_id,
    )
    return output[0]["generated_text"][-1]["content"]
