import type { ColorValue } from "@/lib/mtg-colors";

const SCRYFALL_COLLECTION = "https://api.scryfall.com/cards/collection";
const CI_MAP: Record<string, ColorValue> = {
  W: "White", U: "Blue", B: "Black", R: "Red", G: "Green",
};

function parseCardNames(decklist: string): string[] {
  const names = new Set<string>();
  for (const line of decklist.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("//")) continue;
    const m = t.match(/^\d+x?\s+(.+)$/i);
    if (m) names.add(m[1].trim());
  }
  return Array.from(names);
}

/**
 * Look up every card in the decklist via the Scryfall collection endpoint and
 * return the union of their color identities. Falls back to empty array on failure.
 */
export async function detectColorsFromDecklist(decklist: string): Promise<ColorValue[]> {
  const names = parseCardNames(decklist);
  if (names.length === 0) return [];

  const identity = new Set<ColorValue>();

  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75);
    try {
      const res = await fetch(SCRYFALL_COLLECTION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const card of data.data ?? []) {
        for (const ci of (card.color_identity ?? []) as string[]) {
          const color = CI_MAP[ci];
          if (color) identity.add(color);
        }
      }
    } catch {
      // network error — skip chunk, proceed with what we have
    }
  }

  return Array.from(identity);
}
