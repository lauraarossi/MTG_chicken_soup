.PHONY: up down logs pull-models fetch-scryfall fetch-edhrec build-dataset embed-cards train merge-lora

# ── App ───────────────────────────────────────────────────────────────────────

up:
	docker compose up

up-local:
	docker compose --profile local-llm up

down:
	docker compose down

logs:
	docker compose logs -f backend

# ── Ollama model setup ────────────────────────────────────────────────────────

pull-models:
	docker compose exec ollama ollama pull llama3.2
	docker compose exec ollama ollama pull nomic-embed-text

# ── Data pipeline (run in order) ─────────────────────────────────────────────

fetch-scryfall:
	docker compose exec backend python -m app.ml.data.fetch_scryfall

fetch-edhrec:
	docker compose exec backend python -m app.ml.data.fetch_edhrec

build-dataset:
	docker compose exec backend python -m app.ml.data.build_dataset

# ── RAG embeddings ────────────────────────────────────────────────────────────
# Requires Ollama running with nomic-embed-text pulled (make pull-models).
# Re-run this whenever the Scryfall data is refreshed.

embed-cards:
	docker compose exec backend python -m app.ml.data.embed_cards

# ── Fine-tuning (requires GPU + NVIDIA Container Toolkit) ────────────────────
# Run fetch-scryfall, fetch-edhrec, build-dataset first.

train:
	docker compose -f docker-compose.train.yml run --rm trainer

merge-lora:
	docker compose -f docker-compose.train.yml run --rm trainer \
		python -m app.ml.training.merge_lora models/mtg-qlora models/mtg-merged
