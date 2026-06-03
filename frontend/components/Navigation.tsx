"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { setAuthToken } from "@/lib/api";
import { useEffect } from "react";

const links = [
  { href: "/build",   label: "Build"     },
  { href: "/analyze", label: "Analyze"   },
  { href: "/decks",   label: "My Decks"  },
  { href: "/help",    label: "Ask Magic" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    setAuthToken(session?.accessToken ?? null);
  }, [session?.accessToken]);

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm dark:shadow-slate-900/60">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-indigo-600 dark:text-indigo-400 text-lg tracking-tight">
          MTG Chicken Soup
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
              title={session.user.email ?? undefined}
            >
              {session.user.name?.split(" ")[0] ?? session.user.email} · Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
