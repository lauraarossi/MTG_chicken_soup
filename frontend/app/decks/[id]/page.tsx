"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Deck } from "@/types";
import ChatInterface from "@/components/ChatInterface";

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;
    api.decks
      .get(id)
      .then(setDeck)
      .catch(() => router.push("/decks"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  if (!deck) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{deck.name}</h1>
        <p className="text-gray-500">Commander: {deck.commander}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {deck.decklist && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold mb-3">Decklist</h2>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono overflow-auto max-h-96">
              {deck.decklist}
            </pre>
          </div>
        )}
        <div>
          <h2 className="font-semibold mb-3">Chat about this deck</h2>
          <ChatInterface deckId={deck.id} />
        </div>
      </div>
    </div>
  );
}
