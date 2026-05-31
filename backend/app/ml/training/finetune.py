"""QLoRA fine-tuning script for the MTG deck assistant.

Usage:
    python -m app.ml.training.finetune
    python -m app.ml.training.finetune configs/training_config.yaml
"""
import json
import sys
from pathlib import Path

import yaml
import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer

SYSTEM_PROMPT = (
    "You are an expert Magic: The Gathering player and deck builder specializing in "
    "the Commander/EDH format. You provide detailed, thoughtful advice for building "
    "and improving decks, considering card synergies, mana curve, win conditions, "
    "and budget constraints."
)


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def load_dataset(path: str) -> Dataset:
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return Dataset.from_list(rows)


def format_example(example: dict, tokenizer) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": example["instruction"]},
        {"role": "assistant", "content": example["output"]},
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    return {"text": text}


def train(config_path: str = "configs/training_config.yaml"):
    cfg = load_config(config_path)

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=cfg["use_4bit"],
        bnb_4bit_quant_type=cfg["bnb_4bit_quant_type"],
        bnb_4bit_compute_dtype=getattr(torch, cfg["bnb_4bit_compute_dtype"]),
        bnb_4bit_use_double_quant=cfg["use_nested_quant"],
    )

    print(f"Loading base model: {cfg['model_name']}")
    model = AutoModelForCausalLM.from_pretrained(
        cfg["model_name"],
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    tokenizer = AutoTokenizer.from_pretrained(cfg["model_name"], trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    lora_config = LoraConfig(
        r=cfg["lora_r"],
        lora_alpha=cfg["lora_alpha"],
        target_modules=cfg["target_modules"],
        lora_dropout=cfg["lora_dropout"],
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    dataset = load_dataset(cfg["dataset_path"])
    split = dataset.train_test_split(test_size=cfg["validation_split"], seed=42)
    train_data = split["train"].map(lambda ex: format_example(ex, tokenizer))
    eval_data = split["test"].map(lambda ex: format_example(ex, tokenizer))

    training_args = TrainingArguments(
        output_dir=cfg["output_dir"],
        num_train_epochs=cfg["num_train_epochs"],
        per_device_train_batch_size=cfg["per_device_train_batch_size"],
        gradient_accumulation_steps=cfg["gradient_accumulation_steps"],
        learning_rate=cfg["learning_rate"],
        lr_scheduler_type=cfg["lr_scheduler_type"],
        warmup_ratio=cfg["warmup_ratio"],
        fp16=cfg.get("fp16", False),
        bf16=cfg.get("bf16", True),
        logging_steps=cfg["logging_steps"],
        save_steps=cfg["save_steps"],
        eval_steps=cfg["eval_steps"],
        eval_strategy="steps",
        save_total_limit=cfg["save_total_limit"],
        load_best_model_at_end=True,
        dataloader_num_workers=cfg["dataloader_num_workers"],
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_data,
        eval_dataset=eval_data,
        dataset_text_field="text",
        max_seq_length=cfg["max_seq_length"],
        tokenizer=tokenizer,
        packing=False,
    )

    print("Starting training...")
    trainer.train()
    trainer.save_model(cfg["output_dir"])
    tokenizer.save_pretrained(cfg["output_dir"])
    print(f"Model saved → {cfg['output_dir']}")


if __name__ == "__main__":
    config_path = sys.argv[1] if len(sys.argv) > 1 else "configs/training_config.yaml"
    train(config_path)
