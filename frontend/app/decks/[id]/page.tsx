"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Deck } from "@/types";
import ChatInterface from "@/components/ChatInterface";
import { parseColors, MTG_COLOR_META } from "@/lib/mtg-colors";

const COMMANDER_FORMATS = new Set(["commander", "brawl"]);

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

  // Decklist editing
  const [editingDecklist, setEditingDecklist] = useState(false);
  const [draftDecklist, setDraftDecklist] = useState("");
  const [savingDecklist, setSavingDecklist] = useState(false);
  const [copiedDecklist, setCopiedDecklist] = useState(false);

  // Metadata editing
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCommander, setDraftCommander] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // Share / delete
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setSavingDecklist(true);
    try {
      const updated = await api.decks.update(deck.id, { decklist: draftDecklist || undefined });
      setDeck(updated);
      setEditingDecklist(false);
    } finally {
      setSavingDecklist(false);
    }
  }

  async function copyDecklistToClipboard() {
    if (!deck?.decklist) return;
    await navigator.clipboard.writeText(deck.decklist);
    setCopiedDecklist(true);
    setTimeout(() => setCopiedDecklist(false), 2000);
  }

  function startEditingDecklist() {
    setDraftDecklist(deck?.decklist ?? "");
    setEditingDecklist(true);
  }

  function openMetaEdit() {
    if (!deck) return;
    setDraftName(deck.name);
    setDraftCommander(deck.commander ?? "");
    setDraftDescription(deck.description ?? "");
    setEditingMeta(true);
  }

  async function saveMeta() {
    if (!deck) return;
    setSavingMeta(true);
    try {
      const updated = await api.decks.update(deck.id, {
        name: draftName.trim() || deck.name,
        decklist: deck.decklist ?? undefined,
        description: draftDescription.trim() || undefined,
      });
      setDeck({ ...updated, commander: draftCommander.trim() || deck.commander });
      setEditingMeta(false);
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDelete() {
    if (!deck || !window.confirm(`Delete "${deck.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.decks.delete(deck.id);
      router.push("/decks");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveFromChat(text: string) {
    if (!deck) return;
    const extracted = extractDecklist(text);
    if (!extracted) return;
    const updated = await api.decks.update(deck.id, { decklist: extracted });
    setDeck(updated);
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500 dark:text-slate-400">Loading...</div>;
  if (!deck) return null;

  const colors = parseColors(deck.colors);
  const isCommander = COMMANDER_FORMATS.has(deck.format);

  const borderStyle = colors.length > 1
    ? { borderWidth: 2, borderStyle: "solid" as const, borderImage: `linear-gradient(135deg, ${colors.map((c) => MTG_COLOR_META.find((m) => m.value === c)?.solid).join(", ")}) 1` }
    : colors.length === 1
    ? { borderWidth: 2, borderStyle: "solid" as const, borderColor: MTG_COLOR_META.find((m) => m.value === colors[0])?.solid }
    : {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{deck.name}</h1>
            <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-1 rounded-full capitalize">{deck.format}</span>
            {colors.length > 0 && (
              <div className="flex gap-1">
                {colors.map((c) => {
                  const meta = MTG_COLOR_META.find((m) => m.value === c);
                  if (!meta) return null;
                  return (
                    <span key={c} className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${meta.pip}`} title={c}>
                      {meta.symbol}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          {isCommander && deck.commander && deck.commander !== "Unknown" && (
            <p className="text-gray-500 dark:text-slate-400 text-sm">Commander: {deck.commander}</p>
          )}
          {deck.description && (
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{deck.description}</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <button
            onClick={openMetaEdit}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={handleShare}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            {copiedLink ? "✓ Copied!" : "🔗 Share"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "🗑 Delete"}
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700" style={borderStyle}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Decklist</h2>
            <div className="flex gap-2">
              {deck.decklist && !editingDecklist && (
                <button
                  onClick={copyDecklistToClipboard}
                  className="text-xs px-3 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {copiedDecklist ? "Copied!" : "Copy"}
                </button>
              )}
              {!editingDecklist && (
                <button
                  onClick={startEditingDecklist}
                  className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  {deck.decklist ? "Edit" : "Import"}
                </button>
              )}
            </div>
          </div>

          {editingDecklist ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={draftDecklist}
                onChange={(e) => setDraftDecklist(e.target.value)}
                placeholder={"// Commander\n1 Your Commander\n\n// Lands\n1 Command Tower\n..."}
                rows={16}
                className="w-full text-sm font-mono border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingDecklist(false)}
                  className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDecklist}
                  disabled={savingDecklist}
                  className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingDecklist ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : deck.decklist ? (
            <pre className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap font-mono overflow-auto max-h-48 sm:max-h-96">
              {deck.decklist}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 dark:text-slate-500">No decklist yet. Click Import to add one.</p>
          )}
        </div>

        <div>
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-slate-100">Chat about this deck</h2>
          <ChatInterface deckId={deck.id} onSaveDeck={handleSaveFromChat} />
        </div>
      </div>

      {/* Edit metadata modal */}
      {editingMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Edit deck</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {isCommander && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Commander</label>
                  <input
                    type="text"
                    value={draftCommander}
                    onChange={(e) => setDraftCommander(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setEditingMeta(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={saveMeta}
                disabled={savingMeta || !draftName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingMeta ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
