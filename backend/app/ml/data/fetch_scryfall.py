"""Download and process Scryfall's bulk card database."""
import json
from pathlib import Path

import requests
from tqdm import tqdm

BULK_DATA_URL = "https://api.scryfall.com/bulk-data"
RAW_PATH = Path("data/raw/scryfall_default_cards.json")
PROCESSED_DIR = Path("data/processed")


def _get_bulk_download_url() -> str:
    resp = requests.get(BULK_DATA_URL, timeout=10)
    resp.raise_for_status()
    for item in resp.json()["data"]:
        if item["type"] == "default_cards":
            return item["download_uri"]
    raise ValueError("default_cards bulk data not found")


def download_cards():
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    url = _get_bulk_download_url()
    print(f"Downloading from {url} ...")

    resp = requests.get(url, stream=True, timeout=120)
    resp.raise_for_status()
    total = int(resp.headers.get("content-length", 0))

    with open(RAW_PATH, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as bar:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
            bar.update(len(chunk))

    print(f"Saved to {RAW_PATH}")


def filter_commander_legal(cards: list[dict]) -> list[dict]:
    """Keep one entry per card name, Commander-legal only."""
    seen: set[str] = set()
    filtered = []

    for card in cards:
        if card.get("lang") != "en" or card.get("digital", False):
            continue
        name = card.get("name", "")
        if name in seen:
            continue
        if card.get("legalities", {}).get("commander") not in ("legal", "restricted"):
            continue
        seen.add(name)
        type_line = card.get("type_line", "")
        filtered.append(
            {
                "name": name,
                "mana_cost": card.get("mana_cost", ""),
                "cmc": card.get("cmc", 0),
                "type_line": type_line,
                "oracle_text": card.get("oracle_text", ""),
                "power": card.get("power"),
                "toughness": card.get("toughness"),
                "colors": card.get("colors", []),
                "color_identity": card.get("color_identity", []),
                "keywords": card.get("keywords", []),
                "is_legendary": "Legendary" in type_line,
                "is_creature": "Creature" in type_line,
                "is_land": "Land" in type_line,
                "prices_usd": card.get("prices", {}).get("usd"),
                "edhrec_rank": card.get("edhrec_rank"),
            }
        )

    return filtered


def main():
    if not RAW_PATH.exists():
        download_cards()
    else:
        print(f"Raw data already at {RAW_PATH}, skipping download.")

    print("Filtering Commander-legal cards...")
    with open(RAW_PATH) as f:
        all_cards = json.load(f)

    cards = filter_commander_legal(all_cards)
    print(f"{len(cards)} Commander-legal cards found")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    cards_path = PROCESSED_DIR / "edh_cards.json"
    index_path = PROCESSED_DIR / "card_index.json"

    with open(cards_path, "w") as f:
        json.dump(cards, f, indent=2)

    card_index = {c["name"]: c for c in cards}
    with open(index_path, "w") as f:
        json.dump(card_index, f)

    print(f"Saved cards → {cards_path}")
    print(f"Saved index → {index_path}")


if __name__ == "__main__":
    main()
