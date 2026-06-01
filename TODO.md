# MTG Chicken Soup — Backlog

## In Progress
- [ ] Railway deployment (backend deploying, frontend TBD)

## Frontend
- [ ] Restyle with darker theme and more colourful accents (Vuetify-like aesthetic)
- [ ] Streaming chat responses (show tokens as they arrive instead of waiting for full response)
- [ ] Fix LLM truncation / running out of tokens mid-response

## Backend
- [ ] RAG: embed cards and test retrieval quality (requires Ollama + nomic-embed-text)
- [ ] Tune system prompt for better MTG advice quality

## Deployment
- [ ] Deploy frontend to Railway
- [ ] Set NEXT_PUBLIC_API_URL to backend Railway URL
- [ ] Add a custom domain
- [ ] Test end-to-end on Railway with a friend

## Data & ML
- [ ] Run Scryfall + EDHREC data pipeline
- [ ] Evaluate whether fine-tuning is worth it vs prompt engineering

## Testing & CI
- [ ] Backend test suite (pytest)
- [ ] Frontend test suite (Jest + React Testing Library)
- [ ] GitHub Actions workflow to run all tests on PR
- [ ] Branch protection rule: require passing CI before merging to main

## Nice to Have
- [ ] Deck import (paste MTGO / Moxfield format to create a saved deck)
- [ ] Deck export (copy to clipboard in MTGO / Moxfield format)
- [ ] Save deck from chat (extract decklist from assistant response)
- [ ] Card image previews on hover
- [ ] Mobile-friendly layout
