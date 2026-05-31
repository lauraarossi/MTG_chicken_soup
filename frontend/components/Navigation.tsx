import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-gray-900 text-lg">
          MTG Chicken Soup
        </Link>
        <div className="flex gap-6 text-sm text-gray-600">
          <Link href="/build" className="hover:text-gray-900 transition-colors">
            Build
          </Link>
          <Link href="/analyze" className="hover:text-gray-900 transition-colors">
            Analyze
          </Link>
          <Link href="/decks" className="hover:text-gray-900 transition-colors">
            My Decks
          </Link>
        </div>
      </div>
    </nav>
  );
}
