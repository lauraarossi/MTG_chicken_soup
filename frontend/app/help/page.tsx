"use client";
import { useEffect, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import { api } from "@/lib/api";
import type { Deck } from "@/types";

function buildSystemContext(decks: Deck[]): string {
  const lines = ["FORMAT:rules"];
  if (decks.length > 0) {
    lines.push(
      "The user has the following saved decks — reference them if relevant to the question:",
      ...decks.map((d) => {
        const colors = d.colors ? ` (${d.colors})` : "";
        const commander = d.commander ? ` — ${d.commander}` : "";
        return `• ${d.name} [${d.format}${colors}${commander}]`;
      }),
    );
  }
  return lines.join("\n");
}

export default function HelpPage() {
  const [systemContext, setSystemContext] = useState<string>("FORMAT:rules");

  useEffect(() => {
    api.decks.list().then((decks) => setSystemContext(buildSystemContext(decks))).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ask about Magic</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Rules, mechanics, terminology, interactions — ask anything.
        </p>
      </div>
      <ChatInterface systemContext={systemContext} />
    </div>
  );
}
