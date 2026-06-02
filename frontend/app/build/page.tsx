"use client";
import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";

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
  set: string,
  colors: string,
): string {
  if (format.isLimited) {
    const setClause = set.trim() ? ` for ${set.trim()}` : "";
    const colorClause = colors.trim() ? ` I'm considering going into ${colors.trim()} colors.` : "";
    return `I'm playing ${format.label}${setClause}.${colorClause} What are the key cards, archetypes, and strategies I should know about? Please give me practical advice on card evaluation and what to prioritise.`;
  }
  if (format.hasCommander) {
    return `I want to build a ${format.label} deck around ${commander.trim()}. What are the key cards and strategy I should consider?`;
  }
  const archetypeClause = archetype.trim() ? ` I'm thinking about a ${archetype.trim()} archetype.` : "";
  return `I want to build a ${format.label} deck.${archetypeClause} What are the key cards and strategy I should consider?`;
}

export default function BuildPage() {
  const [format, setFormat] = useState(FORMATS[0]);
  const [commander, setCommander] = useState("");
  const [archetype, setArchetype] = useState("");
  const [set, setSet] = useState("");
  const [colors, setColors] = useState("");
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const handleFormatChange = (value: string) => {
    const f = FORMATS.find((f) => f.value === value) ?? FORMATS[0];
    setFormat(f);
    setCommander("");
    setArchetype("");
    setSet("");
    setColors("");
  };

  const isValid = format.isLimited
    ? true
    : format.hasCommander
    ? commander.trim().length > 0
    : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setInitialMessage(buildInitialMessage(format, commander, archetype, set, colors));
  };

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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Colors you're considering <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  placeholder="e.g. blue-black, green-white-red"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
        <ChatInterface initialMessage={initialMessage} />
      )}
    </div>
  );
}
