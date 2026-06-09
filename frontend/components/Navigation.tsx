"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { setAuthToken } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/build",   label: "Build",     icon: IconBuild    },
  { href: "/analyze", label: "Analyze",   icon: IconAnalyze  },
  { href: "/decks",   label: "My Decks",  icon: IconDecks    },
  { href: "/help",    label: "Ask Magic", icon: IconChat     },
  { href: "/about",   label: "Help",      icon: IconHelp     },
];

function IconBuild({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function IconAnalyze({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function IconDecks({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878M4.5 9.878A2.25 2.25 0 0 0 3 12v6a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-6a2.25 2.25 0 0 0-1.5-2.122" />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

function IconHelp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAuthToken(session?.accessToken ?? null);
  }, [session?.accessToken]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const user = session?.user;
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="font-bold text-indigo-600 dark:text-indigo-400 text-base leading-tight"
        >
          MTG Chicken Soup
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-gray-200 dark:border-slate-800 p-3 shrink-0" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {user.image ? (
              <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                {user.name?.split(" ")[0] ?? user.email}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{user.email}</p>
            </div>
            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-1">
              <Link
                href="/profile"
                onClick={() => { setUserMenuOpen(false); setMobileOpen(false); }}
                className="block px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-56 bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 flex items-center gap-3 px-4">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="p-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
        </button>
        <Link href="/" className="font-bold text-indigo-600 dark:text-indigo-400">
          MTG Chicken Soup
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-56 bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 z-40 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
