import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">MTG Chicken Soup</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg">Your AI-powered Magic: The Gathering assistant</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Link
          href="/build"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-3">🏗️</div>
          <h2 className="font-semibold text-lg mb-1 text-gray-900 dark:text-gray-100">Build a Deck</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Start from a commander and get card suggestions tailored to your strategy
          </p>
        </Link>

        <Link
          href="/analyze"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-3">🔍</div>
          <h2 className="font-semibold text-lg mb-1 text-gray-900 dark:text-gray-100">Analyze a Deck</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Paste your decklist and get improvement suggestions
          </p>
        </Link>

        <Link
          href="/decks"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-3">📚</div>
          <h2 className="font-semibold text-lg mb-1 text-gray-900 dark:text-gray-100">My Decks</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">View and manage your saved decks</p>
        </Link>

        <Link
          href="/help"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-3">❓</div>
          <h2 className="font-semibold text-lg mb-1 text-gray-900 dark:text-gray-100">Ask about Magic</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Rules, mechanics, interactions — ask anything</p>
        </Link>
      </div>
    </main>
  );
}
