"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { api } from "@/lib/api";

const COLOR_GLOW: Record<string, string> = {
  White:     "rgba(248, 231, 120, 0.22)",
  Blue:      "rgba(59,  130, 246, 0.22)",
  Black:     "rgba(139,  92, 246, 0.22)",
  Red:       "rgba(239,  68,  68, 0.22)",
  Green:     "rgba(34,  197,  94, 0.22)",
  Colorless: "rgba(148, 163, 184, 0.22)",
};

const COLOR_SOLID: Record<string, string> = {
  White:     "#c8a951",
  Blue:      "#3b82f6",
  Black:     "#8b5cf6",
  Red:       "#ef4444",
  Green:     "#22c55e",
  Colorless: "#94a3b8",
};

function getGradientStyle(colors: string[]): React.CSSProperties {
  if (colors.length === 0) return {};
  const stops = colors.map((c) => COLOR_GLOW[c]).filter(Boolean);
  if (stops.length === 1) {
    return { background: `radial-gradient(ellipse 90% 60% at 50% -10%, ${stops[0]}, transparent 70%)` };
  }
  const gradientStops = stops.map((s, i) => `${s} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(", ");
  return { background: `linear-gradient(135deg, ${gradientStops})` };
}

function getAccentColor(colors: string[]): string {
  if (colors.length === 0) return "#3b82f6"; // default blue
  return COLOR_SOLID[colors[0]] ?? "#3b82f6";
}

const MTG_COLORS = [
  { value: "White",     symbol: "W", bg: "bg-yellow-50  dark:bg-yellow-900/30", border: "border-yellow-300 dark:border-yellow-600", text: "text-yellow-800 dark:text-yellow-200", tip: "Order, law, protection. Removal, lifegain, tokens, wraths." },
  { value: "Blue",      symbol: "U", bg: "bg-blue-50    dark:bg-blue-900/30",   border: "border-blue-300   dark:border-blue-600",   text: "text-blue-800   dark:text-blue-200",   tip: "Knowledge, control, perfection. Counterspells, card draw, flying." },
  { value: "Black",     symbol: "B", bg: "bg-gray-100   dark:bg-gray-700",      border: "border-gray-400   dark:border-gray-500",   text: "text-gray-800   dark:text-gray-200",   tip: "Power, ambition, death. Tutors, removal, reanimation, sacrifice." },
  { value: "Red",       symbol: "R", bg: "bg-red-50     dark:bg-red-900/30",    border: "border-red-300    dark:border-red-600",    text: "text-red-800    dark:text-red-200",    tip: "Chaos, freedom, emotion. Aggro, burn, haste, impulse draw." },
  { value: "Green",     symbol: "G", bg: "bg-green-50   dark:bg-green-900/30",  border: "border-green-300  dark:border-green-600",  text: "text-green-800  dark:text-green-200",  tip: "Nature, growth, strength. Ramp, big creatures, trample." },
  { value: "Colorless", symbol: "C", bg: "bg-slate-100  dark:bg-slate-700",     border: "border-slate-300  dark:border-slate-500",  text: "text-slate-700  dark:text-slate-300",  tip: "Artifacts and Eldrazi. No colored mana requirements." },
] as const;

function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-[10px] flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none"
        aria-label="More info"
      >
        i
      </button>
      {visible && (
        <span className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-48 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-2 shadow-lg pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

function ColorCheckboxes({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (c: string[]) => void;
}) {
  function toggle(value: string) {
    if (value === "Colorless") {
      onChange(colors.includes("Colorless") ? [] : ["Colorless"]);
      return;
    }
    const withoutColorless = colors.filter((c) => c !== "Colorless");
    onChange(
      withoutColorless.includes(value)
        ? withoutColorless.filter((c) => c !== value)
        : [...withoutColorless, value],
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Colours <span className="text-gray-400 font-normal">(optional — none = no preference)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {MTG_COLORS.map(({ value, symbol, bg, border, text, tip }) => {
          const checked = colors.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${bg} ${text} ${
                checked ? `${border} ring-2 ring-offset-1 ring-blue-500` : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <span className="font-bold">{symbol}</span>
              <span>{value}</span>
              <Tooltip text={tip} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const FORMATS = [
  { value: "commander", label: "Commander / EDH", hasCommander: true, isLimited: false },
  { value: "brawl", label: "Brawl", hasCommander: true, isLimited: false },
  { value: "standard", label: "Standard", hasCommander: false, isLimited: false },
  { value: "pioneer", label: "Pioneer", hasCommander: false, isLimited: false },
  { value: "modern", label: "Modern", hasCommander: false, isLimited: false },
  { value: "legacy", label: "Legacy", hasCommander: false, isLimited: false },
  { value: "vintage", label: "Vintage", hasCommander: false, isLimited: false },
  { value: "pauper", label: "Pauper", hasCommander: false, isLimited: false },
  { value: "explorer", label: "Explorer", hasCommander: false, isLimited: false },
  { value: "historic", label: "Historic", hasCommander: false, isLimited: false },
  { value: "draft", label: "Draft", hasCommander: false, isLimited: true },
  { value: "sealed", label: "Sealed", hasCommander: false, isLimited: true },
];

function buildInitialMessage(
  format: (typeof FORMATS)[number],
  commander: string,
  archetype: string,
  colors: string[],
  themes: string,
  set: string,
): string {
  if (format.isLimited) {
    const setClause = set.trim() ? ` for ${set.trim()}` : "";
    const colorClause = colors.length > 0 ? ` I'm considering going into ${colors.join("-")} colors.` : "";
    return `I'm playing ${format.label}${setClause}.${colorClause} What are the key cards, archetypes, and strategies I should know about? Please give me practical advice on card evaluation and what to prioritise.`;
  }
  if (format.hasCommander) {
    return `I want to build a ${format.label} deck around ${commander.trim()}. What are the key cards and strategy I should consider?`;
  }
  const parts: string[] = [];
  if (colors.length > 0) parts.push(`colours: ${colors.join("-")}`);
  if (archetype.trim()) parts.push(`archetype: ${archetype.trim()}`);
  if (themes.trim()) parts.push(`built around: ${themes.trim()}`);
  const detailClause = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return `I want to build a ${format.label} deck${detailClause}. What are the key cards and strategy I should consider?`;
}

function extractDecklist(text: string): string | null {
  const lines = text.split("\n").filter((line) => {
    const t = line.trim();
    return /^\d+x?\s+\S/.test(t) || /^\/\//.test(t);
  });
  return lines.length > 0 ? lines.join("\n") : null;
}

export default function BuildPage() {
  const router = useRouter();
  const [format, setFormat] = useState(FORMATS[0]);
  const [commander, setCommander] = useState("");
  const [archetype, setArchetype] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [themes, setThemes] = useState("");
  const [set, setSet] = useState("");
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [saveDialog, setSaveDialog] = useState<{ text: string; deckName: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFormatChange = (value: string) => {
    const f = FORMATS.find((f) => f.value === value) ?? FORMATS[0];
    setFormat(f);
    setCommander("");
    setArchetype("");
    setColors([]);
    setThemes("");
    setSet("");
  };

  const isValid = format.isLimited
    ? true
    : format.hasCommander
    ? commander.trim().length > 0
    : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setInitialMessage(buildInitialMessage(format, commander, archetype, colors, themes, set));
  };

  function openSaveDialog(text: string) {
    const defaultName = commander.trim()
      ? `${commander.trim()} Deck`
      : `${format.label} Deck`;
    setSaveDialog({ text, deckName: defaultName });
  }

  async function confirmSave() {
    if (!saveDialog) return;
    setSaving(true);
    try {
      const deck = await api.decks.create({
        name: saveDialog.deckName,
        commander: commander.trim() || "Unknown",
        format: format.value,
        decklist: extractDecklist(saveDialog.text) ?? saveDialog.text,
      });
      router.push(`/decks/${deck.id}`);
    } finally {
      setSaving(false);
      setSaveDialog(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {format.isLimited ? "Limited Advice" : "Build a Deck"}
      </h1>

      {!initialMessage ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Format
            </label>
            <select
              value={format.value}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <optgroup label="Constructed">
                {FORMATS.filter((f) => !f.isLimited).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label="Limited">
                {FORMATS.filter((f) => f.isLimited).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {format.hasCommander && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Commander
              </label>
              <input
                type="text"
                value={commander}
                onChange={(e) => setCommander(e.target.value)}
                placeholder="e.g. Atraxa, Praetors' Voice"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {!format.hasCommander && !format.isLimited && (
            <>
              <ColorCheckboxes colors={colors} onChange={setColors} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Archetype <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={archetype}
                  onChange={(e) => setArchetype(e.target.value)}
                  placeholder="e.g. burn, control, midrange, combo"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cards, themes, or tribes to build around <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={themes}
                  onChange={(e) => setThemes(e.target.value)}
                  placeholder="e.g. Goblin tribal, Teferi, graveyard recursion"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {format.isLimited && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Set <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={set}
                  onChange={(e) => setSet(e.target.value)}
                  placeholder="e.g. Duskmourn, Bloomburrow"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ColorCheckboxes colors={colors} onChange={setColors} />
            </>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {format.isLimited ? "Get Advice" : "Start Building"}
          </button>
        </form>
      ) : (
        <div
          className="rounded-2xl p-1"
          style={{
            background: colors.length > 0
              ? `linear-gradient(135deg, ${colors.map((c) => COLOR_SOLID[c]).join(", ")})`
              : "transparent",
          }}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={getGradientStyle(colors)}
          >
            <ChatInterface
              initialMessage={initialMessage}
              accentColor={getAccentColor(colors)}
              onCreateDeck={openSaveDialog}
            />
          </div>
        </div>
      )}

      {saveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Save deck</h2>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deck name
            </label>
            <input
              type="text"
              value={saveDialog.deckName}
              onChange={(e) => setSaveDialog({ ...saveDialog, deckName: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSaveDialog(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={saving || !saveDialog.deckName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
