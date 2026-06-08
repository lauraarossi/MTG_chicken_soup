export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Help &amp; Documentation</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Everything you need to know about MTG Chicken Soup.
      </p>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-y-auto max-h-[72vh] p-6 space-y-8 text-sm text-gray-700 dark:text-slate-300">

          {/* What is this */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">What is MTG Chicken Soup?</h2>
            <p>
              MTG Chicken Soup is an AI-powered deck builder and analyzer for Magic: The Gathering.
              It combines a large language model with a card database and semantic search to give you
              specific, grounded advice — not generic theory. It supports all major formats: Commander/EDH,
              Standard, Pioneer, Modern, Legacy, Vintage, Pauper, Explorer, Historic, Brawl, Draft, and Sealed.
            </p>
          </section>

          {/* Sections */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-3">How to use each section</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Build a Deck</h3>
                <p>
                  Choose a format, enter a commander or theme, and optionally add extra instructions
                  (budget constraints, cards you want to include, playstyle preferences). The AI will
                  suggest a deck strategy and card choices. When you are happy with the result, click
                  <strong> Extract &amp; Save Deck</strong> below the chat window to save the decklist
                  to your collection.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Analyze a Deck</h3>
                <p>
                  Paste a decklist in MTGO/Moxfield format, or upload a <code>.txt</code> or <code>.csv</code> file.
                  The AI will review the deck and suggest improvements. The chat frame will automatically
                  take on the color identity of your deck. After chatting, use{" "}
                  <strong>Extract &amp; Save Deck</strong> to save a revised version as a new deck.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1">My Decks</h3>
                <p>
                  Browse, edit, and manage all your saved decks. From each deck's detail page you can
                  edit the decklist, export it as <code>.txt</code> or <code>.csv</code>, and continue
                  chatting with the AI about that specific deck. You can also import a deck from a file
                  using the Import button on the My Decks list page.
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
          </section>

          {/* Data sources */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">Where does the information come from?</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Scryfall</strong> — all card data (oracle text, mana costs, types, legality) is
                fetched from the Scryfall API and used for RAG (retrieval-augmented generation). When you
                mention a card, the system looks it up and injects accurate data into the prompt so the AI
                doesn't have to rely on (possibly outdated) training memory.
              </li>
              <li>
                <strong>EDHREC</strong> — commander recommendation data is included in the AI's training
                dataset to improve Commander/EDH advice quality.
              </li>
              <li>
                <strong>LLM knowledge</strong> — the underlying model has broad MTG knowledge from its
                training data, which covers most cards and strategies up to its knowledge cutoff.
                Very recent sets may not be fully represented.
              </li>
            </ul>
          </section>

          {/* Deck format */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">Decklist format</h2>
            <p className="mb-2">
              The app uses standard MTGO/Moxfield plain-text format with optional section headers:
            </p>
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
            <p className="mt-2">
              Section headers (<code>// Section Name</code>) are optional but help the AI and the export
              functions organize the decklist. The CSV export format includes card type data fetched from
              Scryfall and is compatible with popular deck management tools.
            </p>
          </section>

          {/* API */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">Public API</h2>
            <p className="mb-3">
              MTG Chicken Soup exposes a public REST API for programmatic deck generation.
              All API requests require an API key in the <code>X-API-Key</code> header.
              To request a key, email <a href="mailto:mtgchicken@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">mtgchicken@gmail.com</a>.
            </p>

            <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-2">POST /api/v1/deck</h3>
            <p className="mb-2">Generate a deck. Returns a structured decklist.</p>

            <p className="font-medium text-gray-800 dark:text-slate-200 mb-1">Request body</p>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 font-mono text-xs overflow-x-auto mb-3">
{`{
  "format": "commander",       // required — one of: commander, brawl, standard,
                               //   pioneer, modern, legacy, vintage, pauper,
                               //   explorer, historic, draft, sealed
  "commander": "Atraxa, Praetors' Voice",  // required for commander/brawl
  "prompt": "focus on infect and proliferate, budget under $100"
                               // optional with a commander; required otherwise
}`}
            </pre>

            <p className="font-medium text-gray-800 dark:text-slate-200 mb-1">Response</p>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3 font-mono text-xs overflow-x-auto mb-3">
{`{
  "format": "commander",
  "commander": "Atraxa, Praetors' Voice",
  "decklist": "// Commander\n1 Atraxa, Praetors' Voice\n\n// Lands\n..."
}`}
            </pre>

            <p className="font-medium text-gray-800 dark:text-slate-200 mb-1">Example (curl)</p>
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

            <p className="mt-3">
              The full OpenAPI schema is available at <code>/docs</code> on the backend (port 8000 locally,
              or your Railway deployment URL). It includes all request/response schemas and validation rules.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">Contact &amp; API access</h2>
            <p>
              For API key requests, bug reports, or feature suggestions, reach out at{" "}
              <a href="mailto:mtgchicken@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                mtgchicken@gmail.com
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
