import type { Deck, DeckCreate, Conversation } from "@/types";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  decks: {
    list: () => fetchAPI<Deck[]>("/decks"),
    get: (id: number) => fetchAPI<Deck>(`/decks/${id}`),
    create: (data: DeckCreate) =>
      fetchAPI<Deck>("/decks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<DeckCreate>) =>
      fetchAPI<Deck>(`/decks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      fetchAPI<void>(`/decks/${id}`, { method: "DELETE" }),
  },
  chat: {
    send: (message: string, conversationId?: number, deckId?: number, signal?: AbortSignal) =>
      fetchAPI<Conversation>("/chat", {
        method: "POST",
        signal,
        body: JSON.stringify({
          message,
          conversation_id: conversationId ?? null,
          deck_id: deckId ?? null,
        }),
      }),
    extractDeck: (conversationId: number) =>
      fetchAPI<{ decklist: string }>("/chat/extract-deck", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId }),
      }),
  },
};
