# MTG Chicken Soup — Backlog

## In Progress
- [ ] Restyle with darker theme and more colourful accents (Vuetify-like aesthetic)

## Frontend
- [ ] Streaming chat responses (show tokens as they arrive instead of waiting for full response)
- [ ] Fix LLM truncation / running out of tokens mid-response

## Backend
- [ ] RAG: embed cards and test retrieval quality (requires Ollama + nomic-embed-text)
- [ ] Tune system prompt for better MTG advice quality

## Deployment
- [x] Deploy backend to Railway
- [x] Deploy frontend to Railway
- [x] Fix CORS and mixed content issues (Next.js rewrite proxy)
- [ ] Add a custom domain
- [ ] Test end-to-end on Railway with Claude API key

## Testing & CI
- [ ] Backend test suite (pytest)
- [ ] Frontend test suite (Jest + React Testing Library)
- [ ] GitHub Actions CI workflow for PRs
- [ ] Branch protection rule requiring passing CI

## Data & ML
- [ ] Run Scryfall + EDHREC data pipeline
- [ ] Evaluate whether fine-tuning is worth it vs prompt engineering

## Nice to Have
- [ ] Deck import
- [ ] Deck export (copy to clipboard in MTGO / Moxfield format)
- [ ] Save deck from chat (extract decklist from assistant response)
- [ ] Card image previews on hover
- [ ] Mobile-friendly layout
