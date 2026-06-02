"use client";
import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";

export default function AnalyzePage() {
  const [decklist, setDecklist] = useState("");
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decklist.trim()) return;
    setInitialMessage(
      `Please analyze this Commander decklist and suggest improvements:\n\n${decklist.trim()}`
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">Analyze a Deck</h1>

      {!initialMessage ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6"
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Paste your decklist (MTGO / Moxfield format)
          </label>
          <textarea
            value={decklist}
            onChange={(e) => setDecklist(e.target.value)}
            placeholder={"1 Atraxa, Praetors' Voice\n1 Hardened Scales\n1 Doubling Season\n..."}
            rows={14}
            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
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
