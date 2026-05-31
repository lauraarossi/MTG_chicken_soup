"use client";
import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";

export default function BuildPage() {
  const [commander, setCommander] = useState("");
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commander.trim()) return;
    setInitialMessage(
      `I want to build a Commander EDH deck around ${commander.trim()}. ` +
        `What are the key cards and strategy I should consider?`
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Build a Deck</h1>

      {!initialMessage ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commander Name
          </label>
          <input
            type="text"
            value={commander}
            onChange={(e) => setCommander(e.target.value)}
            placeholder="e.g. Atraxa, Praetors' Voice"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Building
          </button>
        </form>
      ) : (
        <ChatInterface initialMessage={initialMessage} />
      )}
    </div>
  );
}
