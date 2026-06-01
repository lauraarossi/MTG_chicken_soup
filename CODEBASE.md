# MTG Chicken Soup — Codebase Guide

An AI-powered Magic: The Gathering Commander (EDH) deck builder and analyzer. The app lets you chat with a locally-hosted LLM that has been fine-tuned on real Commander data from Scryfall and EDHREC.

---

## Architecture Overview

```
MTG_chicken_soup/
├── backend/          Python/FastAPI REST API + ML pipeline
├── frontend/         Next.js 14 web UI
├── data/             Placeholder for downloaded/processed training data
├── docker-compose.yml
├── .env.example
└── .gitignore
```

Three services run together via Docker Compose:

- **db** — PostgreSQL 16, stores decks and chat history
- **backend** — FastAPI app at `localhost:8000`
- **frontend** — Next.js dev server at `localhost:3000`

The ML pipeline (data fetching → dataset building → fine-tuning) is a separate offline step you run once before deploying. The API then loads the trained model and uses it for chat responses.

---

## Root-level Files

### `docker-compose.yml`
Defines the three services. The backend mounts `./backend`, `./models`, and `./data` so code and model weights are live-editable without rebuilding the image. The `db` service uses a health check so the backend waits for Postgres to be ready before starting.

### `.env.example`
Template for the `.env` file Docker Compose reads at runtime. Copy it to `.env` and fill in:
- `POSTGRES_PASSWORD` — the database password
- `DATABASE_URL` — full async SQLAlchemy connection string
- `MODEL_PATH` — path to your fine-tuned merged model (set after training)
- `HF_TOKEN` — HuggingFace token, needed only if you use a gated model like Llama

### `.gitignore`
Excludes everything that should never be committed: Python bytecode, virtual envs, `.env`, downloaded raw/processed data (`data/raw/`, `data/processed/`), trained model weights (`models/`, `*.safetensors`, `*.bin`), and Node/Next build artifacts.

---

## Backend

### `backend/Dockerfile`
Builds the Python 3.14 image. Installs `gcc` and `libpq-dev` (needed to compile `psycopg2`), then installs Python dependencies from `requirements.txt`. The default `CMD` is overridden in `docker-compose.yml` to add `--reload` during development.

### `backend/requirements.txt`
Two groups of dependencies:
- **Always installed**: FastAPI, Uvicorn, SQLAlchemy async, asyncpg, Alembic, Pydantic v2, httpx/requests/tqdm (for the data fetchers), and the `datasets` library.
- **ML section (commented out)**: PyTorch, Transformers, PEFT, TRL, bitsandbytes, accelerate — only needed when running the training scripts. Kept commented to keep the Docker image small for the API-only use case.

### `backend/alembic.ini`
Alembic configuration file. Points to the `alembic/` directory for migration scripts. The actual database URL is overridden at runtime by `alembic/env.py` (which reads it from `settings`), so this file doesn't need editing.

### `backend/alembic/env.py`
Alembic's runtime environment. Imports all SQLAlchemy models so Alembic can compare them against the real database schema to auto-generate migrations. Uses the async engine because the rest of the app is fully async. Run `alembic revision --autogenerate -m "description"` to generate a new migration after changing models.

### `backend/alembic/script.py.mako`
Jinja2 template Alembic uses when generating new migration files. Boilerplate — you generally don't edit this.

### `backend/alembic/versions/.gitkeep`
Empty placeholder so git tracks the `versions/` directory. Migration files you generate will live here.

---

### `backend/app/__init__.py`
Empty — marks `app/` as a Python package.

### `backend/app/main.py`
FastAPI application entry point. Does three things:
1. **Lifespan hook** — on startup, creates all database tables by running `Base.metadata.create_all`. This is a convenience for development; in production you'd use Alembic migrations exclusively.
2. **CORS middleware** — allows requests from `localhost:3000` (the Next.js frontend).
3. **Router registration** — mounts the `decks` and `chat` routers under `/api`.

### `backend/app/config.py`
Pydantic `BaseSettings` class that reads configuration from environment variables / `.env`. Exposes:
- `database_url` — SQLAlchemy async connection string
- `model_name` — HuggingFace model ID to use as the base (defaults to `Qwen/Qwen2.5-7B-Instruct`)
- `model_path` — optional path to the local fine-tuned model; when set, the inference module loads from disk instead of HuggingFace Hub

### `backend/app/database.py`
Sets up the async SQLAlchemy engine and session factory. `get_db()` is a FastAPI dependency that opens a session for each request and closes it cleanly after.

### `backend/app/schemas/__init__.py`
Empty package marker.

### `backend/app/schemas/deck.py`
Pydantic v2 schemas for the deck API:
- `DeckCreate` — fields required to create a deck (name, commander, optional description/decklist)
- `DeckUpdate` — all fields optional, for PATCH requests
- `DeckResponse` — what the API returns, including auto-generated `id`, `created_at`, `updated_at`

### `backend/app/schemas/conversation.py`
Pydantic v2 schemas for the chat API:
- `ChatRequest` — incoming message plus optional `conversation_id` (to continue a thread) and `deck_id` (to scope the chat to a specific deck)
- `MessageResponse` / `ConversationResponse` — what the API returns, including the full message history

### `backend/app/api/__init__.py`
Empty package marker.

### `backend/app/api/decks.py`
CRUD REST endpoints for decks at `/api/decks`:
- `GET /` — list all decks, newest first
- `POST /` — create a deck
- `GET /{id}` — fetch one deck
- `PATCH /{id}` — partial update (name, description, or decklist)
- `DELETE /{id}` — remove a deck

### `backend/app/api/chat.py`
Single `POST /api/chat/` endpoint. Handles both new and continuing conversations:
1. If `conversation_id` is supplied, loads the existing conversation and its messages.
2. Otherwise creates a new `Conversation` row (optionally linked to a deck).
3. Appends the user's message, calls `get_response()` from the ML inference module with the full history, appends the assistant reply, persists everything, and returns the full conversation.

---

### `backend/app/ml/__init__.py`
Empty package marker.

### `backend/app/ml/inference.py`
Exposes `get_response(message, history)` backed by the Claude API (`claude-opus-4-8` by default). Uses `AsyncAnthropic` with streaming and adaptive thinking. The system prompt has a `cache_control` breakpoint so it's eligible for prompt caching on repeated requests. Returns a helpful error string if `ANTHROPIC_API_KEY` is missing or invalid rather than raising an exception.

---

### `backend/app/ml/data/` — Data Pipeline

Run these three scripts in order before training.

#### `fetch_scryfall.py`
Downloads Scryfall's "default cards" bulk export (~300 MB JSON). Filters to Commander-legal English cards, deduplicates by name, and outputs:
- `data/processed/edh_cards.json` — array of cleaned card objects
- `data/processed/card_index.json` — dict keyed by card name for O(1) lookups

Keeps only the fields useful for the assistant: mana cost, CMC, oracle text, colors, type line, price, EDHREC rank, etc.

#### `fetch_edhrec.py`
Scrapes EDHREC's public JSON API for the top ~200 commanders. For each commander it fetches the recommended card categories (ramp, draw, removal, win conditions, etc.) with synergy scores. Caches raw responses under `data/raw/edhrec/` so re-runs don't re-hit the API. Outputs `data/processed/edhrec_commanders.json`. Falls back to a hardcoded seed list of 30 popular commanders if the EDHREC index fetch fails.

#### `build_dataset.py`
Combines the Scryfall card data and EDHREC commander data to generate `data/processed/training_dataset.jsonl` — a JSONL file where each line is `{"instruction": "...", "output": "..."}`. Four types of training examples are generated per commander:
- **Strategy** — "What is the strategy for X?" → overview of the deck's game plan
- **Card recommendations** — "What are the best ramp cards for X?" → list from EDHREC categories
- **Deck build** — "Build me a deck around X" → suggested 99 using EDHREC's top picks
- **Improvement** — "Here's my decklist, how can I improve it?" → suggestions + general deckbuilding tips

---

### `backend/app/ml/training/` — Model Training

#### `finetune.py`
QLoRA fine-tuning script using HuggingFace PEFT + TRL. Reads all hyperparameters from the YAML config. Workflow:
1. Loads the base model in 4-bit NF4 quantization (fits a 7B model in 16 GB VRAM)
2. Attaches LoRA adapters to all attention and MLP projection layers
3. Formats each training example with the model's chat template (system prompt + user + assistant turns)
4. Trains with `SFTTrainer`, evaluating every 100 steps
5. Saves the LoRA adapter weights to `models/mtg-qlora/`

Run with: `python -m app.ml.training.finetune` (optionally passing a config path).

#### `merge_lora.py`
After fine-tuning, merges the LoRA adapter back into the base model weights to produce a standalone model at `models/mtg-merged/`. The merged model loads faster at inference time because there's no adapter overhead. After merging, set `MODEL_PATH=models/mtg-merged` in `.env`.

Run with: `python -m app.ml.training.merge_lora models/mtg-qlora models/mtg-merged`

---

### `backend/configs/training_config.yaml`
All training hyperparameters in one place so you don't touch Python to tune training:
- **Model**: `Qwen/Qwen2.5-7B-Instruct` (no gated access required; swap for Llama 3.1 if preferred)
- **LoRA**: rank 32, alpha 64, applied to all 7 projection matrices (q/k/v/o/gate/up/down)
- **Training**: 3 epochs, effective batch size 16 (4 per device × 4 gradient accumulation steps), cosine LR schedule, bfloat16
- **Quantization**: 4-bit NF4 with double quantization — tuned to fit on an RTX 5070 Ti (16 GB VRAM)
- **Dataset**: points to `data/processed/training_dataset.jsonl` with 10% validation split

---

## Frontend

### `frontend/Dockerfile`
Runs the Next.js dev server inside Docker. The `node_modules` and `.next` directories are declared as anonymous volumes so they live inside the container and don't get clobbered by the bind-mounted source code.

### `frontend/package.json`
Next.js 14 app with React 18. Dev dependencies include TypeScript 5, Tailwind CSS 3, and ESLint. No extra UI libraries — components are hand-rolled with Tailwind utility classes.

### `frontend/next.config.mjs`
Minimal Next.js config (no customizations beyond the defaults).

### `frontend/tsconfig.json`
TypeScript config for Next.js with strict mode and path aliases (`@/` maps to the project root).

### `frontend/tailwind.config.ts`
Tailwind config that scans `app/`, `components/`, and `pages/` for class names.

### `frontend/postcss.config.js`
Required PostCSS config to enable Tailwind and Autoprefixer.

### `frontend/app/globals.css`
Imports Tailwind's base, components, and utilities layers. No custom CSS beyond that.

### `frontend/app/layout.tsx`
Root layout wrapping every page. Sets the page `<title>` and description metadata, applies the Inter font, and renders the `<Navigation>` component above all page content.

### `frontend/app/page.tsx`
The home page (`/`). Three card links — Build, Analyze, My Decks — as the entry points into the app.

### `frontend/app/build/page.tsx`
The deck builder page (`/build`). Shows a form with a single commander name input. On submit it synthesises an initial chat message ("I want to build a Commander deck around X...") and hands it to `<ChatInterface>`, which fires it automatically on mount. From there the conversation continues freely.

### `frontend/app/analyze/page.tsx`
The deck analyzer page (`/analyze`). Shows a textarea where you paste a decklist in MTGO/Moxfield format. On submit it wraps the decklist in an analysis prompt and passes it to `<ChatInterface>` as the seed message.

### `frontend/app/decks/page.tsx`
The saved decks library (`/decks`). Fetches all decks from the API on mount and renders them in a responsive grid using `<DeckCard>`.

### `frontend/app/decks/[id]/page.tsx`
The individual deck view (`/decks/:id`). Loads the deck by ID, shows the stored decklist in a scrollable monospace panel on the left, and a `<ChatInterface>` scoped to that deck on the right — so the AI knows which deck you're discussing.

---

### `frontend/components/Navigation.tsx`
Sticky top nav bar with the app name as a home link and links to Build, Analyze, and My Decks.

### `frontend/components/DeckCard.tsx`
Card component for the deck list. Shows name, format badge, commander, description preview (clamped to 2 lines), creation date, and a "View →" link to the detail page.

### `frontend/components/ChatInterface.tsx`
The reusable chat UI. Manages local message state, sends messages via `api.chat.send()`, and shows optimistic user messages immediately while the request is in flight. Automatically scrolls to the latest message. Accepts optional `initialMessage` (sent once on mount) and `deckId` props. User messages appear in blue on the right; assistant responses in grey on the left.

---

### `frontend/lib/api.ts`
Thin typed wrapper around `fetch`. All requests go to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). Exposes two namespaces:
- `api.decks` — list, get, create, update, delete
- `api.chat.send` — post a message, returns the full updated conversation

### `frontend/types/index.ts`
TypeScript interface definitions mirroring the backend Pydantic schemas: `Deck`, `DeckCreate`, `Message`, `Conversation`. Shared by all frontend components so types stay consistent with the API contract.

---

## Data & Model Directories

### `data/.gitkeep`
Empty placeholder. The `data/` directory is where the data pipeline writes its output (`data/raw/`, `data/processed/`). Both subdirectories are excluded by `.gitignore` because the files are large and reproducible by running the scripts.

The `models/` directory (not committed) is where trained model weights land (`models/mtg-qlora/` after fine-tuning, `models/mtg-merged/` after merging).

---

## End-to-End Flow

```
1. Run data pipeline (once):
   python -m app.ml.data.fetch_scryfall
   python -m app.ml.data.fetch_edhrec
   python -m app.ml.data.build_dataset

2. Fine-tune (once, requires GPU):
   python -m app.ml.training.finetune

3. Merge LoRA weights (once):
   python -m app.ml.training.merge_lora models/mtg-qlora models/mtg-merged

4. Set MODEL_PATH=models/mtg-merged in .env

5. Run the app:
   docker compose up

6. Open http://localhost:3000
```
