# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AI-powered Magic: The Gathering deck builder and analyzer. FastAPI backend + Next.js 14 frontend + PostgreSQL (with `pgvector`), talking to an LLM for chat responses.

## Commands

```bash
make up            # docker compose up (all three services)
make up-local      # include the Ollama service for local LLM inference
make down          # stop all services
make logs          # tail backend logs

# Data pipeline (run in order inside the running backend container)
make fetch-scryfall
make fetch-edhrec
make build-dataset

make embed-cards   # generate RAG embeddings (requires Ollama + nomic-embed-text)

make train         # QLoRA fine-tune (requires GPU + NVIDIA Container Toolkit)
make merge-lora    # merge LoRA adapter into base model weights
```

Frontend (run inside `frontend/` or via the Docker container):
```bash
npm run dev     # dev server on :3000
npm run build
npm run lint
```

Backend (run inside `backend/` or via the Docker container):
```bash
uvicorn app.main:app --reload                          # dev server on :8000
alembic revision --autogenerate -m "description"       # generate migration
alembic upgrade head                                   # apply migrations
```

## Architecture

Three Docker services (`docker-compose.yml`):
- **db** — `pgvector/pgvector:pg16`, stores decks and chat history. The `vector` extension is enabled at startup by `main.py`'s lifespan hook.
- **backend** — FastAPI at `:8000`, bind-mounts `./backend`, `./models`, `./data` so edits are live without rebuilding.
- **frontend** — Next.js at `:3000`, proxies API calls to `http://backend:8000` (via `BACKEND_URL` env var).
- **ollama** — optional, only starts with `--profile local-llm`.

### Backend (`backend/app/`)

| Path | Purpose |
|------|---------|
| `config.py` | Pydantic `BaseSettings` — all env vars live here |
| `database.py` | Async SQLAlchemy engine + `get_db()` dependency |
| `main.py` | App entry point: CORS, router registration, lifespan |
| `api/decks.py` | CRUD endpoints at `/api/decks` |
| `api/chat.py` | `POST /api/chat/` — conversation persistence + LLM call |
| `ml/inference.py` | `get_response()` — multi-provider LLM dispatch |

#### Inference provider selection (`ml/inference.py`)

Default try order: **ollama → free → claude**. Set `INFERENCE_PROVIDER` in `.env` to pin a provider first. Each provider is skipped if its config is absent:
- `OLLAMA_MODEL` — local Ollama (wins if set)
- `FREE_API_BASE_URL` + `FREE_MODEL` + `FREE_API_KEY` — any OpenAI-compatible endpoint (GitHub Models, Groq, Cerebras, OpenRouter)
- `ANTHROPIC_API_KEY` — Claude API (`claude-opus-4-8` by default; override with `MODEL_NAME`)

The system prompt is built dynamically in `build_system_prompt()`: a base MTG expert prompt + a format-specific addendum selected by `_detect_format()` (keyword scan of the first user message, or a `FORMAT:<name>` sentinel at the start of the `context` arg).

### Frontend (`frontend/`)

Next.js 14 App Router. No external UI libraries — all components use Tailwind utility classes.

Key files:
- `lib/api.ts` — typed `fetch` wrapper; two namespaces: `api.decks.*` and `api.chat.send()`
- `lib/mtg-colors.ts` — `MTG_COLOR_META` maps color names → Tailwind classes, glow/border CSS. Used everywhere color identity needs to render.
- `types/index.ts` — TypeScript interfaces mirroring backend Pydantic schemas
- `components/ChatInterface.tsx` — reusable chat panel; accepts `initialMessage` (fires once on mount) and optional `deckId`
- `app/build/page.tsx` — deck advisor: commander input → seeds `ChatInterface`
- `app/analyze/page.tsx` — paste decklist → seeds `ChatInterface`
- `app/decks/[id]/page.tsx` — split view: decklist panel + `ChatInterface` scoped to that deck

### Database models

- `Deck` — name, commander, format, colors (comma-separated), description, decklist (text)
- `Conversation` — optional FK to a deck
- `Message` — role (`user`/`assistant`), content, FK to conversation
- `CardEmbedding` — card name + `pgvector` embedding (for RAG, not yet wired into chat)

Alembic handles migrations (`alembic/versions/`). The lifespan hook also calls `create_all` as a dev convenience and handles the `colors` column addition idempotently.

## Environment variables

Copy `.env.example` to `.env`. Minimum needed to run:
```
POSTGRES_PASSWORD=mtgpassword
```
Plus at least one LLM provider (see `.env.example` for all options).

## ML / data pipeline

Only needed if fine-tuning. The deployed app uses the Claude API by default.

1. Run the three data scripts (`fetch_scryfall` → `fetch_edhrec` → `build_dataset`) to produce `data/processed/training_dataset.jsonl`.
2. `make train` runs QLoRA fine-tuning via `docker-compose.train.yml` (separate Dockerfile, ML deps uncommented).
3. `make merge-lora` merges adapters; set `MODEL_PATH=models/mtg-merged` in `.env` to use the result.

Training config is entirely in `backend/configs/training_config.yaml`.
