"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Deck } from "@/types";
import ChatInterface from "@/components/ChatInterface";

function extractDecklist(text: string): string | null {
  const lines = text.split("\n").filter((line) => {
    const t = line.trim();
    return /^\d+x?\s+\S/.test(t) || /^\/\//.test(t);
  });
  return lines.length > 0 ? lines.join("\n") : null;
}

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftDecklist, setDraftDecklist] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;
    api.decks
      .get(id)
      .then(setDeck)
      .catch(() => router.push("/decks"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function saveDecklist() {
    if (!deck) return;
    setSaving(true);
    try {
      const updated = await api.decks.update(deck.id, { decklist: draftDecklist || undefined });
      setDeck(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyToClipboard() {
    if (!deck?.decklist) return;
    await navigator.clipboard.writeText(deck.decklist);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startEditing() {
    setDraftDecklist(deck?.decklist ?? "");
    setEditing(true);
  }

  async function handleSaveFromChat(text: string) {
    if (!deck) return;
    const extracted = extractDecklist(text);
    if (!extracted) return;
    const updated = await api.decks.update(deck.id, { decklist: extracted });
    setDeck(updated);
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!deck) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{deck.name}</h1>
        <p className="text-gray-500 dark:text-gray-400">Commander: {deck.commander}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Decklist</h2>
            <div className="flex gap-2">
              {deck.decklist && !editing && (
                <button
                  onClick={copyToClipboard}
                  className="text-xs px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
              {!editing && (
                <button
                  onClick={startEditing}
                  className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {deck.decklist ? "Edit" : "Import"}
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={draftDecklist}
                onChange={(e) => setDraftDecklist(e.target.value)}
                placeholder={"// Commander\n1 Your Commander\n\n// Lands\n1 Command Tower\n..."}
                rows={16}
                className="w-full text-sm font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDecklist}
                  disabled={saving}
                  className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : deck.decklist ? (
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-auto max-h-48 sm:max-h-96">
              {deck.decklist}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No decklist yet. Click Import to add one.</p>
          )}
        </div>

        <div>
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Chat about this deck</h2>
          <ChatInterface deckId={deck.id} onSaveDeck={handleSaveFromChat} />
        </div>
      </div>
    </div>
  );
}
