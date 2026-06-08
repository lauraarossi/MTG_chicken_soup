"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { api } from "@/lib/api";
import { readDeckFile } from "@/lib/deck-io";
import { InlineLoadingDots } from "@/components/LoadingDots";
import { MTG_COLOR_META, getAccentColor, getGlowStyle } from "@/lib/mtg-colors";
import type { ColorValue } from "@/lib/mtg-colors";

const COLOR_SOLID: Record<string, string> = Object.fromEntries(
  MTG_COLOR_META.map((m) => [m.value, m.solid])
);

const FORMATS = [
  "commander","brawl","standard","pioneer","modern",
  "legacy","vintage","pauper","explorer","historic","draft","sealed",
];

const LAND_COLOR: Record<string, string> = {
  plains: "White", island: "Blue", swamp: "Black", mountain: "Red", forest: "Green",
};

function detectColorsSync(decklist: string): ColorValue[] {
  const found = new Set<string>();
  for (const line of decklist.split("\n")) {
    const m = line.trim().match(/^\d+x?\s+(.+)$/i);
    if (m) {
      const name = m[1].trim().toLowerCase();
      if (LAND_COLOR[name]) found.add(LAND_COLOR[name]);
    }
  }
  return Array.from(found) as ColorValue[];
}

async function detectColorsFromCommander(decklist: string): Promise<ColorValue[] | null> {
  const m = decklist.match(/\/\/\s*commander\s*\n\s*\d+\s+(.+)/i);
  if (!m) return null;
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(m[1].trim())}`
    );
    if (!res.ok) return null;
    const card = await res.json();
    const identity: string[] = card.color_identity ?? [];
    const map: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
    return identity.length === 0
      ? (["Colorless"] as ColorValue[])
      : (identity.map((c) => map[c]).filter(Boolean) as ColorValue[]);
  } catch {
    return null;
  }
}

function detectCommander(decklist: string): string {
  const m = decklist.match(/\/\/\s*commander\s*\n\s*\d+\s+(.+)/i);
  return m?.[1]?.trim() ?? "";
}

export default function AnalyzePage() {
  const router = useRouter();
  const [decklist, setDecklist] = useState("");
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorValue[]>([]);
  const [detectedFormat, setDetectedFormat] = useState("standard");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saveDialog, setSaveDialog] = useState<{
    decklist: string; deckName: string; commander: string; format: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function applyDecklist(text: string) {
    setDecklist(text);
    const syncColors = detectColorsSync(text);
    if (syncColors.length) setColors(syncColors);
    const cmdColors = await detectColorsFromCommander(text);
    if (cmdColors) setColors(cmdColors);
    const commander = detectCommander(text);
    setDetectedFormat(commander ? "commander" : "standard");
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decklist.trim()) return;
    setInitialMessage(
      `Please analyze this decklist and suggest improvements:\n\n${decklist.trim()}`
    );
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await readDeckFile(file);
      await applyDecklist(text);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function openSaveDialog(text: string) {
    const commander = detectCommander(decklist);
    setSaveDialog({
      decklist: text,
      deckName: commander ? `${commander} Deck` : "Analyzed Deck",
      commander,
      format: detectedFormat,
    });
  }

  async function confirmSave() {
    if (!saveDialog) return;
    setSaving(true);
    try {
      const deck = await api.decks.create({
        name: saveDialog.deckName,
        commander: saveDialog.commander || undefined,
        format: saveDialog.format,
        decklist: saveDialog.decklist,
        colors: colors.length > 0 ? colors.join(",") : undefined,
      });
      router.push(`/decks/${deck.id}`);
    } finally {
      setSaving(false);
      setSaveDialog(null);
    }
  }

  const accentColor = getAccentColor(colors);
  const frameColors = colors.map((c) => COLOR_SOLID[c]).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">Analyze a Deck</h1>

      {!initialMessage ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Paste your decklist <span className="font-normal text-gray-400">(MTGO / Moxfield / .txt format)</span>
            </label>
            <div className="flex items-center gap-2">
              {importing && <InlineLoadingDots label="Importing" className="text-xs text-gray-400 dark:text-slate-500" />}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="text-xs px-3 py-1 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Upload .txt / .csv
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <textarea
            value={decklist}
            onChange={(e) => applyDecklist(e.target.value)}
            placeholder={"1 Atraxa, Praetors' Voice\n1 Hardened Scales\n1 Doubling Season\n..."}
            rows={14}
            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!decklist.trim()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Analyze Deck
          </button>
        </form>
      ) : (
        <div
          className="rounded-2xl p-1"
          style={{
            background: frameColors.length > 0
              ? `linear-gradient(135deg, ${frameColors.join(", ")})`
              : "transparent",
          }}
        >
          <div className="rounded-xl overflow-hidden" style={getGlowStyle(colors)}>
            <ChatInterface
              initialMessage={initialMessage}
              accentColor={accentColor}
              frameColors={frameColors}
              onCreateDeck={openSaveDialog}
              placeholder="Ask about your deck..."
            />
          </div>
        </div>
      )}

      {saveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Save deck</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Deck name</label>
              <input
                type="text"
                value={saveDialog.deckName}
                onChange={(e) => setSaveDialog({ ...saveDialog, deckName: e.target.value })}
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Format</label>
              <select
                value={saveDialog.format}
                onChange={(e) => setSaveDialog({ ...saveDialog, format: e.target.value })}
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                {FORMATS.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Commander <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={saveDialog.commander}
                onChange={(e) => setSaveDialog({ ...saveDialog, commander: e.target.value })}
                placeholder="Auto-detected from decklist"
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setSaveDialog(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={saving || !saveDialog.deckName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <InlineLoadingDots label="Saving" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
