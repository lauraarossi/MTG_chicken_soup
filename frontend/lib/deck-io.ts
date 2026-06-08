/**
 * Deck import/export utilities.
 *
 * Supported formats:
 *   .txt — plain "N Card Name" text, optionally with // Section headers
 *   .csv — Count,Name,Type,Section,Scryfall ID  (Archidekt / Goosery style)
 */

// ── Shared helpers ────────────────────────────────────────────────────────────

export interface CardLine { count: number; name: string }

/** Parse "1 Card Name" lines from a text decklist, ignoring // headers and blanks. */
export function parseDecklistText(text: string): CardLine[] {
  const cards: CardLine[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    const m = line.match(/^(\d+)x?\s+(.+)$/);
    if (m) cards.push({ count: parseInt(m[1], 10), name: m[2].trim() });
  }
  return cards;
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── .txt export ───────────────────────────────────────────────────────────────

export function exportTxt(decklist: string, deckName: string) {
  triggerDownload(decklist, `${deckName}.txt`, "text/plain");
}

// ── .csv export ───────────────────────────────────────────────────────────────

function csvField(value: string): string {
  return value.includes(",") || value.includes('"') || value.includes("\n")
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/**
 * Fetch type_line + Scryfall ID for a list of card names via the collection endpoint.
 * Returns a map of lowercase name → { type_line, id }.
 */
async function fetchScryfallData(
  cards: CardLine[],
): Promise<Record<string, { type_line: string; id: string }>> {
  const result: Record<string, { type_line: string; id: string }> = {};
  const names = Array.from(new Set(cards.map((c) => c.name)));

  for (let i = 0; i < names.length; i += 75) {
    const batch = names.slice(i, i + 75).map((name) => ({ name }));
    try {
      const res = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: batch }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const card of data.data ?? []) {
        result[card.name.toLowerCase()] = { type_line: card.type_line ?? "", id: card.id ?? "" };
      }
    } catch {
      // Scryfall unavailable — leave those cards with empty type/id
    }
  }
  return result;
}

export async function exportCsv(decklist: string, deckName: string): Promise<void> {
  const cards = parseDecklistText(decklist);
  const scryfall = await fetchScryfallData(cards);

  const rows = ["Count,Name,Type,Section,Scryfall ID"];
  for (const { count, name } of cards) {
    const info = scryfall[name.toLowerCase()];
    rows.push(
      [count, csvField(name), csvField(info?.type_line ?? ""), "main", info?.id ?? ""].join(","),
    );
  }

  triggerDownload(rows.join("\n"), `${deckName}.csv`, "text/csv");
}

// ── .csv import ───────────────────────────────────────────────────────────────

const SECTION_ORDER = [
  "Creature", "Planeswalker", "Battle",
  "Instant", "Sorcery", "Artifact", "Enchantment", "Land", "Other",
];

function typeToSection(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("planeswalker")) return "Planeswalker";
  if (t.includes("battle"))       return "Battle";
  if (t.includes("creature"))     return "Creature";
  if (t.includes("instant"))      return "Instant";
  if (t.includes("sorcery"))      return "Sorcery";
  if (t.includes("artifact"))     return "Artifact";
  if (t.includes("enchantment"))  return "Enchantment";
  if (t.includes("land"))         return "Land";
  return "Other";
}

/** Parse a single CSV row, respecting double-quoted fields with embedded commas. */
function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Convert a CSV string (Count,Name,Type,Section,Scryfall ID) to a text decklist.
 * Cards are grouped into // Section headers by their type.
 */
export function parseCsvToDecklist(csvText: string): string {
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return "";

  const headers = parseCsvRow(lines[0]).map((h) => h.trim().toLowerCase());
  const countIdx = headers.indexOf("count");
  const nameIdx  = headers.indexOf("name");
  const typeIdx  = headers.indexOf("type");
  if (nameIdx === -1) return "";

  const sections: Record<string, CardLine[]> = {};
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    const name  = row[nameIdx]?.trim();
    if (!name) continue;
    const count = countIdx >= 0 ? parseInt(row[countIdx] ?? "1", 10) : 1;
    const type  = typeIdx >= 0 ? (row[typeIdx]?.trim() ?? "") : "";
    const section = typeToSection(type);
    (sections[section] ??= []).push({ count: isNaN(count) ? 1 : count, name });
  }

  const parts: string[] = [];
  for (const sectionName of SECTION_ORDER) {
    const sectionCards = sections[sectionName];
    if (!sectionCards?.length) continue;
    parts.push(`// ${sectionName}`);
    for (const { count, name } of sectionCards) parts.push(`${count} ${name}`);
    parts.push("");
  }
  return parts.join("\n").trim();
}

/**
 * Read a File object and return a text decklist string.
 * Accepts .txt (passthrough) and .csv (parsed + grouped).
 */
export async function readDeckFile(file: File): Promise<string> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".csv")) {
    return parseCsvToDecklist(text);
  }
  return text;
}
