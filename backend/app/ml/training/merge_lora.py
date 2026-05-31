"""Merge LoRA adapter weights into the base model for standalone deployment.

Usage:
    python -m app.ml.training.merge_lora models/mtg-qlora models/mtg-merged
"""
import json
import sys
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


def merge(adapter_path: str, output_path: str, base_model: str | None = None):
    adapter_path = Path(adapter_path)

    if base_model is None:
        adapter_cfg = json.loads((adapter_path / "adapter_config.json").read_text())
        base_model = adapter_cfg["base_model_name_or_path"]

    print(f"Loading base model: {base_model}")
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        trust_remote_code=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)

    print(f"Loading LoRA adapter: {adapter_path}")
    model = PeftModel.from_pretrained(model, str(adapter_path))

    print("Merging weights...")
    model = model.merge_and_unload()

    print(f"Saving merged model → {output_path}")
    model.save_pretrained(output_path)
    tokenizer.save_pretrained(output_path)
    print("Done. Set MODEL_PATH in your .env to use the merged model.")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python merge_lora.py <adapter_path> <output_path> [base_model]")
        sys.exit(1)
    merge(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
