"use client";
import { useState } from "react";
import Link from "next/link";
import type { Deck } from "@/types";
import { parseColors, MTG_COLOR_META } from "@/lib/mtg-colors";
import { api } from "@/lib/api";
import { InlineLoadingDots } from "@/components/LoadingDots";

const COMMANDER_FORMATS = new Set(["commander", "brawl"]);

function ColorPips({ colors }: { colors: ReturnType<typeof parseColors> }) {
  if (colors.length === 0) return null;
  return (
    <div className="flex gap-1">
      {colors.map((c) => {
        const meta = MTG_COLOR_META.find((m) => m.value === c);
        if (!meta) return null;
        return (
          <i
            key={c}
            className={`ms ms-cost ms-shadow ${meta.ms}`}
            style={{ fontSize: "18px" }}
            title={c}
          />
        );
      })}
    </div>
  );
}

interface Props {
  deck: Deck;
  onDelete?: (id: number) => void;
  onDuplicate?: (deck: Deck) => void;
}

export default function DeckCard({ deck, onDelete, onDuplicate }: Props) {
  const colors = parseColors(deck.colors);
  const isCommander = COMMANDER_FORMATS.has(deck.format);
  const [copied, setCopied] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const borderStyle = colors.length > 1
    ? { borderWidth: 2, borderStyle: "solid" as const, borderImage: `linear-gradient(135deg, ${colors.map((c) => MTG_COLOR_META.find((m) => m.value === c)?.solid).join(", ")}) 1` }
    : colors.length === 1
    ? { borderWidth: 2, borderStyle: "solid" as const, borderColor: MTG_COLOR_META.find((m) => m.value === colors[0])?.solid }
    : {};

  async function handleShare() {
    const url = `${window.location.origin}/decks/${deck.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const copy = await api.decks.create({
        name: `Copy of ${deck.name}`,
        commander: deck.commander || undefined,
        format: deck.format,
        description: deck.description ?? undefined,
        decklist: deck.decklist ?? undefined,
        colors: deck.colors ?? undefined,
      });
      onDuplicate?.(copy);
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${deck.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.decks.delete(deck.id);
      onDelete?.(deck.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-950/50 hover:shadow-md dark:hover:shadow-slate-950/80 transition-all border border-gray-200 dark:border-slate-700 flex flex-col"
      style={borderStyle}
    >
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 leading-snug">{deck.name}</h3>
          <span className="ml-2 shrink-0 text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full capitalize">
            {deck.format}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <ColorPips colors={colors} />
          {isCommander && deck.commander && deck.commander !== "Unknown" && (
            <p className="text-sm text-gray-500 dark:text-slate-400">{deck.commander}</p>
          )}
          {!isCommander && deck.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-1">{deck.description}</p>
          )}
        </div>

        <span className="text-xs text-gray-400 dark:text-slate-500">
          {new Date(deck.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="border-t border-gray-100 dark:border-slate-800 px-5 py-2 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={handleShare}
            title="Copy link"
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 transition-colors text-xs"
          >
            {copied ? "✓ Copied" : "🔗 Share"}
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Duplicate deck"
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 transition-colors text-xs disabled:opacity-50"
          >
            {duplicating ? <InlineLoadingDots label="Copying" /> : "⎘ Copy"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete deck"
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs disabled:opacity-50"
          >
            🗑 Delete
          </button>
        </div>
        <Link href={`/decks/${deck.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          View →
        </Link>
      </div>
    </div>
  );
}
