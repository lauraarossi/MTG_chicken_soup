"""Build the instruction-following training dataset from Scryfall + EDHREC data."""
import json
import random
from pathlib import Path

PROCESSED_DIR = Path("data/processed")
OUTPUT_PATH = PROCESSED_DIR / "training_dataset.jsonl"


def load_data() -> tuple[dict, dict]:
    card_index: dict = json.loads((PROCESSED_DIR / "card_index.json").read_text())
    commanders: dict = json.loads((PROCESSED_DIR / "edhrec_commanders.json").read_text())
    return card_index, commanders


def _card_brief(name: str, card_index: dict) -> str:
    card = card_index.get(name, {})
    cost = card.get("mana_cost", "")
    text = card.get("oracle_text", "")
    brief_text = (text[:90] + "...") if len(text) > 90 else text
    return f"**{name}** {cost} — {brief_text}" if brief_text else f"**{name}** {cost}"


def gen_strategy(data: dict) -> dict | None:
    name = data["name"]
    desc = data.get("description", "")
    categories = data.get("categories", {})
    if not desc and not categories:
        return None

    colors = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}
    color_str = "/".join(colors.get(c, c) for c in data.get("colors", [])) or "colorless"

    lines = [f"{name} is a {color_str} Commander.\n"]
    if desc:
        lines.append(desc + "\n")
    if categories:
        lines.append("**Key categories:**")
        for cat, cards in list(categories.items())[:5]:
            top = ", ".join(c["name"] for c in cards[:5])
            lines.append(f"- **{cat}**: {top}")

    instruction = random.choice([
        f"What is the strategy for a {name} Commander deck?",
        f"Explain how a {name} EDH deck plays and wins.",
        f"I want to build {name}. What's the game plan?",
        f"How does a {name} deck win in Commander?",
    ])
    return {"instruction": instruction, "output": "\n".join(lines)}


def gen_card_recs(data: dict, card_index: dict) -> dict | None:
    name = data["name"]
    categories = data.get("categories", {})
    if not categories:
        return None

    cat = random.choice(list(categories.keys()))
    cards = categories[cat][:10]
    if not cards:
        return None

    instruction = random.choice([
        f"What are the best {cat.lower()} cards for a {name} Commander deck?",
        f"Which {cat.lower()} cards should I include in my {name} deck?",
        f"Suggest {cat.lower()} options for {name} EDH.",
    ])
    lines = [f"Top **{cat}** cards for {name}:\n"]
    for c in cards:
        lines.append(_card_brief(c["name"], card_index))
    return {"instruction": instruction, "output": "\n".join(lines)}


def gen_deck_build(data: dict, card_index: dict) -> dict | None:
    name = data["name"]
    categories = data.get("categories", {})
    if not categories:
        return None

    seen: set[str] = set()
    by_cat: dict[str, list[str]] = {}
    for cat, cards in categories.items():
        for c in cards:
            n = c["name"]
            if n not in seen and n != name:
                by_cat.setdefault(cat, []).append(n)
                seen.add(n)
        if len(seen) >= 70:
            break

    if len(seen) < 20:
        return None

    instruction = random.choice([
        f"Build me a Commander deck around {name}.",
        f"Give me a starting 99 for a {name} EDH deck.",
        f"Help me construct a complete {name} Commander deck.",
    ])
    lines = [f"**{name}** Commander deck — suggested 99:\n", f"**Commander:** 1x {name}\n"]
    for cat, cards in by_cat.items():
        lines.append(f"\n*{cat}:*")
        for card in cards[:8]:
            lines.append(f"  1x {card}")
    lines.append("\n*Lands (36):* Include Command Tower, Arcane Signet, and basics matching your color identity.")
    lines.append(f"\nAdjust to your budget and preferred power level.")
    return {"instruction": instruction, "output": "\n".join(lines)}


def gen_improvement(data: dict, card_index: dict) -> dict | None:
    name = data["name"]
    categories = data.get("categories", {})
    if not categories:
        return None

    all_cards = [
        c["name"]
        for cards in categories.values()
        for c in cards
        if c["name"] != name
    ]
    if len(all_cards) < 30:
        return None

    random.shuffle(all_cards)
    half = len(all_cards) // 2
    user_cards = all_cards[:half]
    suggestions = all_cards[half : half + 8]

    decklist = "\n".join(f"1x {c}" for c in user_cards[:40])
    instruction = (
        f"Here is my {name} Commander deck. What improvements would you suggest?\n\n"
        f"Commander: 1x {name}\n{decklist}\n...(plus 36 lands)"
    )

    lines = [f"Here are improvements for your {name} deck:\n", "**Cards to add:**"]
    for c in suggestions:
        lines.append(_card_brief(c, card_index))
    lines += [
        "\n**General tips:**",
        "- Aim for 10+ ramp sources (mana rocks + land ramp)",
        "- Include 10+ card draw effects to maintain hand advantage",
        "- Have 8-10 interaction pieces (removal, counterspells, board wipes)",
        "- Make sure your win conditions are clear and have redundancy",
    ]
    return {"instruction": instruction, "output": "\n".join(lines)}


def main():
    print("Loading processed data...")
    card_index, commanders = load_data()
    print(f"Loaded {len(card_index)} cards, {len(commanders)} commanders")

    examples: list[dict] = []
    for data in commanders.values():
        for fn in (gen_strategy, gen_card_recs, gen_card_recs, gen_deck_build, gen_improvement):
            ex = fn(data, card_index) if fn in (gen_card_recs, gen_deck_build, gen_improvement) else fn(data)
            if ex:
                examples.append(ex)

    random.shuffle(examples)
    print(f"Generated {len(examples)} training examples")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")

    print(f"Saved → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
