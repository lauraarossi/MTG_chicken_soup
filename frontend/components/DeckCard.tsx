import Link from "next/link";
import type { Deck } from "@/types";

export default function DeckCard({ deck }: { deck: Deck }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{deck.name}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full capitalize">
          {deck.format}
        </span>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Commander: {deck.commander}</p>

      {deck.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{deck.description}</p>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(deck.created_at).toLocaleDateString()}
        </span>
        <Link href={`/decks/${deck.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View →
        </Link>
      </div>
    </div>
  );
}
