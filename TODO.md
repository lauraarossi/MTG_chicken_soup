# MTG Chicken Soup — Backlog

## In Progress
- [ ] Restyle with darker theme and more colourful accents (Vuetify-like aesthetic)

## Frontend
- [ ] Streaming chat responses (show tokens as they arrive instead of waiting for full response)

## Backend
- [ ] RAG: embed cards and test retrieval quality (requires Ollama + nomic-embed-text)
- [ ] Tune system prompt for better MTG advice quality
- [x] INFERENCE_PROVIDER env var to select preferred model

## Deployment
- [x] Deploy backend to Railway
- [x] Deploy frontend to Railway
- [x] Fix CORS and mixed content issues (Next.js rewrite proxy)
- [ ] Add a custom domain
- [ ] Test end-to-end on Railway with Claude API key

## Testing & CI
- [ ] Backend test suite (pytest)
- [ ] Frontend test suite (Jest + React Testing Library)

## Data & ML
- [ ] Connect to friend's Scryfall DB (has oracle text, image URIs, types, mana cost, etc.) — need connection string + schema
- [ ] Generate embeddings from friend's card data into our card_embeddings table (one-time + periodic sync)
- [ ] 7lands integration for limited format win-rate and pick-order data


## Nice to Have
- [x] Deck import (paste decklist on deck detail page)
- [x] Deck export (copy to clipboard on deck detail page)
- [x] Save deck from chat (extract card lines from assistant response)
- [x] Multi-format support (all constructed + Draft/Sealed)
- [ ] Card image previews on hover
- [ ] Mobile-friendly layout
