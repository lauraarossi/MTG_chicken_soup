"use client";
import { useState } from "react";

const SECTIONS = [
  { id: "overview",       label: "What is this?" },
  { id: "how-to-use",     label: "How to use" },
  { id: "data-sources",   label: "Data sources" },
  { id: "decklist-format",label: "Decklist format" },
  { id: "api",            label: "Public API" },
  { id: "contact",        label: "Contact" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case "overview":
      return (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">What is MTG Chicken Soup?</h2>
          <p>
            MTG Chicken Soup is an AI-powered deck builder and analyzer for Magic: The Gathering.
            It combines a large language model with a live card database and semantic search to give
            you specific, grounded advice — not generic theory.
          </p>
          <p>
            Supported formats: Commander/EDH, Brawl, Standard, Pioneer, Modern, Legacy, Vintage,
            Pauper, Explorer, Historic, Draft, and Sealed.
          </p>
        </div>
      );

    case "how-to-use":
      return (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">How to use each section</h2>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Build a Deck</h3>
            <p>
              Choose a format, enter a commander or theme, and optionally add extra instructions
              (budget, cards to include, playstyle preferences). The AI suggests a strategy and
              card choices. When you're happy, click <strong>Extract &amp; Save Deck</strong> below
              the chat to save a full decklist — the AI will complete any missing slots to the
              correct deck size automatically.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Analyze a Deck</h3>
            <p>
              Paste a decklist in MTGO/Moxfield format, or upload a <code>.txt</code> or{" "}
              <code>.csv</code> file. The AI reviews the deck and suggests improvements. The chat
              frame takes on the colour identity of your deck. Use{" "}
              <strong>Extract &amp; Save Deck</strong> to save a revised version as a new deck.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1">My Decks</h3>
            <p>
              Browse, edit, and manage your saved decks. From each deck's page you can edit the
              decklist, export as <code>.txt</code> or <code>.csv</code>, and chat with the AI
              about that specific deck. Import decks from file using the Import button on the
              My Decks list page.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Ask Magic</h3>
            <p>
              A general-purpose rules and mechanics chatbot. Ask about interactions, terminology,
              the stack, priority, card legality, or anything else MTG-related. If you have saved
              decks, the AI can reference them if relevant.
            </p>
          </div>
        </div>
      );

    case "data-sources":
      return (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Where does the information come from?</h2>
          <ul className="space-y-3 list-none">
            <li>
              <span className="font-medium text-gray-900 dark:text-slate-100">Scryfall</span>
              <p className="mt-0.5">
                All card data (oracle text, mana costs, types, legality) is fetched live from the
                Scryfall API. When you mention a card, the system looks it up and injects accurate
                data into the prompt so the AI doesn't rely on (possibly outdated) training memory.
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-900 dark:text-slate-100">EDHREC</span>
              <p className="mt-0.5">
                Commander recommendation data from EDHREC is included in the AI's training dataset
                to improve Commander/EDH advice quality.
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-900 dark:text-slate-100">LLM knowledge</span>
              <p className="mt-0.5">
                The underlying model has broad MTG knowledge from its training data, covering most
                cards and strategies up to its knowledge cutoff. Very recent sets may not be fully
                represented.
              </p>
            </li>
          </ul>
        </div>
      );

    case "decklist-format":
      return (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Decklist format</h2>
          <p>The app uses standard MTGO/Moxfield plain-text format with optional section headers:</p>
          <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 font-mono text-xs overflow-x-auto">
{`// Commander
1 Atraxa, Praetors' Voice

// Lands
1 Command Tower
1 Exotic Orchard

// Ramp
1 Sol Ring
1 Arcane Signet`}
          </pre>
          <p>
            Section headers (<code>// Section Name</code>) are optional but help the AI and export
            functions organise the decklist. The CSV export format includes card type data from
            Scryfall and is compatible with popular deck management tools.
          </p>
        </div>
      );

    case "api":
      return (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Public API</h2>
          <p>
            MTG Chicken Soup exposes a public REST API for programmatic deck generation. All
            requests require an API key in the <code>X-API-Key</code> header. To request a key,
            email{" "}
            <a href="mailto:mtgchicken@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              mtgchicken@gmail.com
            </a>.
          </p>

          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100 mb-1">POST /api/v1/deck</p>
            <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">Generate a complete deck. Returns a structured decklist.</p>

            <p className="font-medium text-gray-800 dark:text-slate-200 mb-1 text-xs uppercase tracking-wide">Request body</p>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 font-mono text-xs overflow-x-auto mb-3">
{`{
  "format": "commander",        // required
  "commander": "Atraxa, Praetors' Voice",
                                // required for commander / brawl
  "prompt": "focus on infect, budget under $100"
                                // optional if commander present; required otherwise
}`}
            </pre>

            <p className="font-medium text-gray-800 dark:text-slate-200 mb-1 text-xs uppercase tracking-wide">Response</p>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 font-mono text-xs overflow-x-auto mb-3">
{`{
  "format": "commander",
  "commander": "Atraxa, Praetors' Voice",
  "decklist": "// Commander\n1 Atraxa, Praetors' Voice\n\n// Lands\n..."
}`}
            </pre>

            <p className="font-medium text-gray-800 dark:text-slate-200 mb-1 text-xs uppercase tracking-wide">Example (curl)</p>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 font-mono text-xs overflow-x-auto">
{`curl -X POST https://your-deployment.railway.app/api/v1/deck \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "format": "commander",
    "commander": "Ghalta and Mavren",
    "prompt": "token swarm with trample finishers"
  }'`}
            </pre>
          </div>

          <p className="text-xs text-gray-500 dark:text-slate-400">
            The full OpenAPI schema is at <code>/docs</code> on the backend.
          </p>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Contact &amp; API access</h2>
          <p>
            For API key requests, bug reports, or feature suggestions, reach out at{" "}
            <a href="mailto:mtgchicken@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              mtgchicken@gmail.com
            </a>.
          </p>
        </div>
      );
  }
}

export default function AboutPage() {
  const [active, setActive] = useState<SectionId>("overview");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">Help &amp; Documentation</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Everything you need to know about MTG Chicken Soup.</p>

      <div className="flex gap-4">
        {/* Sidebar TOC */}
        <nav className="hidden sm:flex flex-col gap-0.5 w-44 shrink-0 pt-0.5">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                active === id
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Mobile section picker */}
        <div className="sm:hidden w-full mb-4">
          <select
            value={active}
            onChange={(e) => setActive(e.target.value as SectionId)}
            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SECTIONS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        {/* Content panel */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-y-auto max-h-[72vh] p-6 text-sm text-gray-700 dark:text-slate-300">
            <SectionContent id={active} />
          </div>
        </div>
      </div>
    </div>
  );
}
