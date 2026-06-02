# MTG Chicken Soup — Backlog

## In Progress
- [ ] Auth: self-hosted NextAuth + Google OAuth + email/password (GDPR) — need Google Cloud OAuth credentials + NEXTAUTH_SECRET

## Frontend
- [ ] Streaming chat responses (show tokens as they arrive)
- [ ] Restyle with darker theme and more colourful accents — in progress (slate/indigo done, more polish possible)

## Backend
- [ ] RAG: connect to friend's Scryfall DB (need connection string + schema), generate embeddings into card_embeddings
- [ ] Tune system prompts further (per-format prompts added; limited still relies on model's training data)

## Deployment
- [x] Deploy backend to Railway
- [x] Deploy frontend to Railway
- [x] Fix CORS and mixed content issues (Next.js rewrite proxy)
- [x] Fix follow-up messages disappearing (AbortController + conversationId ref)
- [ ] Add a custom domain
- [ ] Test end-to-end on Railway with Claude API key

## Testing & CI
- [ ] Backend test suite (pytest)
- [ ] Frontend test suite (Jest + React Testing Library)
- [ ] GitHub Actions CI workflow for PRs
- [ ] Branch protection rule requiring passing CI

## Data & ML
- [ ] Connect to friend's Scryfall DB — need connection string + schema
- [ ] Generate embeddings from card data into card_embeddings (one-time + sync)
- [ ] 7lands integration for limited format win-rate and pick-order data
- [ ] Evaluate fine-tuning vs prompt engineering

## Nice to Have
- [x] Deck import / export / save from chat
- [x] Multi-format support (all constructed + Draft/Sealed + Help/rules chat)
- [x] Colour identity on deck cards and chat (MTG pips, gradient borders, chat theming)
- [x] Extract & Save Deck button (separate LLM call, proper card type sections)
- [x] Format-specific system prompts
- [ ] Card image previews on hover
- [ ] Mobile-friendly layout (basic pass done; could improve further)
- [ ] Deck export to Moxfield/MTGO clipboard format
