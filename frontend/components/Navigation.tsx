import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-gray-900 dark:text-gray-100 text-lg">
          MTG Chicken Soup
        </Link>
        <div className="flex gap-4 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/build" className="py-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            Build
          </Link>
          <Link href="/analyze" className="py-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            Analyze
          </Link>
          <Link href="/decks" className="py-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            My Decks
          </Link>
        </div>
      </div>
    </nav>
  );
}
