export interface Deck {
  id: number;
  name: string;
  commander: string;
  format: string;
  description: string | null;
  decklist: string | null;
  colors: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeckCreate {
  name: string;
  commander?: string;
  format?: string;
  description?: string;
  decklist?: string;
  colors?: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  deck_id: number | null;
  messages: Message[];
  created_at: string;
}
