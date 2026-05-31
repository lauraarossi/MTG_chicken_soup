"""Fetch commander recommendation data from EDHREC's public JSON endpoint."""
import json
import time
from pathlib import Path

import requests
from tqdm import tqdm

EDHREC_JSON_BASE = "https://json.edhrec.com/pages"
RAW_DIR = Path("data/raw/edhrec")
PROCESSED_DIR = Path("data/processed")
HEADERS = {"User-Agent": "mtg-chicken-soup/0.1 (educational project)"}

# Seed list used if the commanders index fetch fails
SEED_COMMANDERS = [
    "atraxa-praetors-voice", "edgar-markov", "meren-of-clan-nel-toth",
    "kaalia-of-the-vast", "oloro-ageless-ascetic", "breya-etherium-shaper",
    "nekusar-the-mindrazer", "narset-enlightened-master", "rhys-the-redeemed",
    "animar-soul-of-elements", "ur-dragon-the", "omnath-locus-of-creation",
    "korvold-fae-cursed-king", "yuriko-the-tigers-shadow", "prossh-skyraider-of-kher",
    "ghave-guru-of-spores", "zur-the-enchanter", "tymna-the-weaver",
    "thrasios-triton-hero", "syr-gwyn-hero-of-ashvale", "muldrotha-the-gravetide",
    "yarok-the-desecrated", "kenrith-the-returned-king", "chulane-teller-of-tales",
    "golos-tireless-pilgrim", "niv-mizzet-reborn", "sisay-weatherlight-captain",
    "uril-the-miststalker", "karador-ghost-chieftain", "riku-of-two-reflections",
]


def fetch_top_commanders() -> list[str]:
    try:
        resp = requests.get(f"{EDHREC_JSON_BASE}/commanders.json", timeout=15, headers=HEADERS)
        if resp.status_code != 200:
            return SEED_COMMANDERS
        slugs = []
        for section in resp.json().get("container", {}).get("json_dict", {}).get("cardlists", []):
            for card in section.get("cardviews", []):
                url = card.get("url", "")
                if "/commanders/" in url:
                    slug = url.strip("/").split("/")[-1]
                    slugs.append(slug)
        return slugs[:200] if slugs else SEED_COMMANDERS
    except Exception as e:
        print(f"Could not fetch commanders list: {e}")
        return SEED_COMMANDERS


def fetch_commander_page(slug: str) -> dict | None:
    try:
        resp = requests.get(
            f"{EDHREC_JSON_BASE}/commanders/{slug}.json", timeout=15, headers=HEADERS
        )
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        print(f"Error fetching {slug}: {e}")
        return None


def parse_commander(slug: str, raw: dict) -> dict | None:
    try:
        json_dict = raw.get("container", {}).get("json_dict", {})
        header = json_dict.get("header", {})
        cardlists = json_dict.get("cardlists", [])

        categories: dict[str, list[dict]] = {}
        for section in cardlists:
            tag = section.get("tag") or section.get("header") or "Other"
            cards = [
                {
                    "name": c["name"],
                    "synergy": c.get("synergy", 0),
                    "num_decks": c.get("num_decks", 0),
                }
                for c in section.get("cardviews", [])
                if c.get("name")
            ]
            if cards:
                categories[tag] = cards

        return {
            "slug": slug,
            "name": header.get("title", slug.replace("-", " ").title()),
            "description": header.get("description", ""),
            "colors": header.get("colors", []),
            "categories": categories,
        }
    except Exception as e:
        print(f"Parse error for {slug}: {e}")
        return None


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching commanders list...")
    slugs = fetch_top_commanders()
    print(f"Found {len(slugs)} commanders")

    commanders: dict[str, dict] = {}

    for slug in tqdm(slugs, desc="Fetching EDHREC data"):
        cache = RAW_DIR / f"{slug}.json"

        if cache.exists():
            raw = json.loads(cache.read_text())
        else:
            raw = fetch_commander_page(slug)
            if raw:
                cache.write_text(json.dumps(raw))
            time.sleep(0.5)  # be polite

        if raw:
            parsed = parse_commander(slug, raw)
            if parsed:
                commanders[slug] = parsed

    out = PROCESSED_DIR / "edhrec_commanders.json"
    out.write_text(json.dumps(commanders, indent=2))
    print(f"Saved {len(commanders)} commanders → {out}")


if __name__ == "__main__":
    main()
