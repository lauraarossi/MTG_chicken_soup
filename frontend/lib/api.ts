import type { Deck, DeckCreate, Conversation } from "@/types";

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
  };
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text();
    const method = options?.method ?? "GET";
    console.error(`[api] ${method} /api${path} → ${res.status}`, text);
    let detail: string;
    try {
      detail = JSON.parse(text)?.detail ?? text;
    } catch {
      detail = text;
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
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
    send: (message: string, conversationId?: number, deckId?: number, signal?: AbortSignal, systemContext?: string) =>
      fetchAPI<Conversation>("/chat", {
        method: "POST",
        signal,
        body: JSON.stringify({
          message,
          conversation_id: conversationId ?? null,
          deck_id: deckId ?? null,
          system_context: systemContext ?? null,
        }),
      }),
    stream: async (
      message: string,
      onToken: (token: string) => void,
      conversationId?: number,
      deckId?: number,
      systemContext?: string,
      signal?: AbortSignal,
    ): Promise<{ conversationId: number; messageId: number }> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
      };
      const res = await fetch(`/api/chat/stream`, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          message,
          conversation_id: conversationId ?? null,
          deck_id: deckId ?? null,
          system_context: systemContext ?? null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = { conversationId: 0, messageId: 0 };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.t !== undefined) onToken(parsed.t);
            else if (parsed.d) result = { conversationId: parsed.cid, messageId: parsed.mid };
          } catch { /* ignore malformed lines */ }
        }
      }
      return result;
    },
    extractDeck: (conversationId: number) =>
      fetchAPI<{ decklist: string }>("/chat/extract-deck", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId }),
      }),
  },
};
