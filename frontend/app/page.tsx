import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">MTG Chicken Soup</h1>
      <p className="text-gray-500 mb-10 text-lg">Your AI-powered Commander deck assistant</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/build"
          className="block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-3">🏗️</div>
          <h2 className="font-semibold text-lg mb-1">Build a Deck</h2>
          <p className="text-gray-500 text-sm">
            Start from a commander and get card suggestions tailored to your strategy
          </p>
        </Link>

        <Link
          href="/analyze"
          className="block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-3">🔍</div>
          <h2 className="font-semibold text-lg mb-1">Analyze a Deck</h2>
          <p className="text-gray-500 text-sm">
            Paste your decklist and get improvement suggestions
          </p>
        </Link>

        <Link
          href="/decks"
          className="block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all"
        >
          <div className="text-3xl mb-3">📚</div>
          <h2 className="font-semibold text-lg mb-1">My Decks</h2>
          <p className="text-gray-500 text-sm">View and manage your saved decks</p>
        </Link>
      </div>
    </main>
  );
}
