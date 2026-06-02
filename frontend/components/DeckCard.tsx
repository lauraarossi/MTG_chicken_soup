import Link from "next/link";
import type { Deck } from "@/types";
import { parseColors, MTG_COLOR_META } from "@/lib/mtg-colors";

const COMMANDER_FORMATS = new Set(["commander", "brawl"]);

function ColorPips({ colors }: { colors: ReturnType<typeof parseColors> }) {
  if (colors.length === 0) return null;
  return (
    <div className="flex gap-1">
      {colors.map((c) => {
        const meta = MTG_COLOR_META.find((m) => m.value === c);
        if (!meta) return null;
        return (
          <span
            key={c}
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-bold ${meta.pip}`}
            title={c}
          >
            {meta.symbol}
          </span>
        );
      })}
    </div>
  );
}

export default function DeckCard({ deck }: { deck: Deck }) {
  const colors = parseColors(deck.colors);
  const isCommander = COMMANDER_FORMATS.has(deck.format);

  const borderStyle = colors.length > 1
    ? { borderWidth: 2, borderStyle: "solid" as const, borderImage: `linear-gradient(135deg, ${colors.map((c) => MTG_COLOR_META.find((m) => m.value === c)?.solid).join(", ")}) 1` }
    : colors.length === 1
    ? { borderWidth: 2, borderStyle: "solid" as const, borderColor: MTG_COLOR_META.find((m) => m.value === colors[0])?.solid }
    : {};

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm hover:shadow-md dark:shadow-slate-950/50 dark:hover:shadow-slate-950/80 transition-all border border-gray-200 dark:border-slate-700"
      style={borderStyle}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 leading-snug">{deck.name}</h3>
        <span className="ml-2 shrink-0 text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full capitalize">
          {deck.format}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <ColorPips colors={colors} />
        {isCommander && deck.commander && deck.commander !== "Unknown" && (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {deck.commander}
          </p>
        )}
        {!isCommander && deck.description && (
          <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-1">
            {deck.description}
          </p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 dark:text-slate-500">
          {new Date(deck.created_at).toLocaleDateString()}
        </span>
        <Link href={`/decks/${deck.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          View →
        </Link>
      </div>
    </div>
  );
}
