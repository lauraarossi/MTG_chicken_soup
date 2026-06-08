"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Deck } from "@/types";
import DeckCard from "@/components/DeckCard";
import { readDeckFile } from "@/lib/deck-io";
import LoadingDots, { InlineLoadingDots } from "@/components/LoadingDots";

const FORMATS = [
  "commander","brawl","standard","pioneer","modern",
  "legacy","vintage","pauper","explorer","historic","draft","sealed",
];

function detectCommander(decklist: string): string {
  const m = decklist.match(/\/\/\s*commander\s*\n\s*\d+\s+(.+)/i);
  return m?.[1]?.trim() ?? "";
}

const LAND_COLOR: Record<string, string> = {
  plains: "White", island: "Blue", swamp: "Black", mountain: "Red", forest: "Green",
};

async function detectColors(decklist: string, commander: string, format: string): Promise<string | undefined> {
  if ((format === "commander" || format === "brawl") && commander) {
    try {
      const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander)}`);
      if (res.ok) {
        const card = await res.json();
        const identity: string[] = card.color_identity ?? [];
        const map: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
        const colors = identity.length === 0 ? ["Colorless"] : identity.map((c) => map[c]).filter(Boolean);
        if (colors.length > 0) return colors.join(",");
      }
    } catch {}
  }
  const found = new Set<string>();
  for (const line of decklist.split("\n")) {
    const m = line.trim().match(/^\d+x?\s+(.+)$/i);
    if (m && LAND_COLOR[m[1].trim().toLowerCase()]) found.add(LAND_COLOR[m[1].trim().toLowerCase()]);
  }
  const colors = Array.from(found);
  return colors.length > 0 ? colors.join(",") : undefined;
}

export default function DecksPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import dialog state
  const [importDialog, setImportDialog] = useState<{
    decklist: string; name: string; commander: string; format: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.decks
      .list()
      .then(setDecks)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleDelete(id: number) {
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }

  function handleDuplicate(deck: Deck) {
    setDecks((prev) => [deck, ...prev]);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const decklist = await readDeckFile(file);
    const commander = detectCommander(decklist);
    const name = file.name.replace(/\.(txt|csv)$/i, "");
    setImportDialog({
      decklist,
      name,
      commander,
      format: commander ? "commander" : "standard",
    });
  }

  async function confirmImport() {
    if (!importDialog) return;
    setSaving(true);
    try {
      const colors = await detectColors(importDialog.decklist, importDialog.commander, importDialog.format);
      const deck = await api.decks.create({
        name: importDialog.name,
        commander: importDialog.commander || undefined,
        format: importDialog.format,
        decklist: importDialog.decklist,
        colors,
      });
      router.push(`/decks/${deck.id}`);
    } finally {
      setSaving(false);
      setImportDialog(null);
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8"><LoadingDots /></div>;
  if (error) return <div className="max-w-4xl mx-auto px-4 py-8 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Decks</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Import
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileChange} />
          <Link
            href="/build"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            + New Deck
          </Link>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No decks yet</p>
          <Link href="/build" className="text-indigo-600 hover:underline">
            Build your first deck
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
      {importDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Import deck</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Deck name</label>
              <input
                type="text"
                value={importDialog.name}
                onChange={(e) => setImportDialog({ ...importDialog, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Format</label>
              <select
                value={importDialog.format}
                onChange={(e) => setImportDialog({ ...importDialog, format: e.target.value })}
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                {FORMATS.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>

            {(importDialog.format === "commander" || importDialog.format === "brawl") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Commander <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={importDialog.commander}
                  onChange={(e) => setImportDialog({ ...importDialog, commander: e.target.value })}
                  placeholder="Auto-detected from decklist"
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setImportDialog(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={saving || !importDialog.name.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <InlineLoadingDots label="Saving" /> : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
