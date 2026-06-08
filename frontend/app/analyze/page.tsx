"use client";
import { useRef, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import { readDeckFile } from "@/lib/deck-io";

export default function AnalyzePage() {
  const [decklist, setDecklist] = useState("");
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decklist.trim()) return;
    setInitialMessage(
      `Please analyze this Commander decklist and suggest improvements:\n\n${decklist.trim()}`
    );
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await readDeckFile(file);
      setDecklist(text);
    } finally {
      setImporting(false);
      // Reset so the same file can be re-imported if needed
      e.target.value = "";
    }
  }

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
              {importing && (
                <span className="text-xs text-gray-400 dark:text-slate-500">Importing…</span>
              )}
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
            onChange={(e) => setDecklist(e.target.value)}
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
        <ChatInterface initialMessage={initialMessage} />
      )}
    </div>
  );
}
