"""Sanity checks for public/data/*.json. Exits non-zero on any failure."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"

errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


def validate_elements():
    elements = json.loads((DATA / "elements.json").read_text(encoding="utf-8"))
    check(len(elements) == 118, f"expected 118 elements, got {len(elements)}")

    numbers = [e["number"] for e in elements]
    check(sorted(numbers) == list(range(1, 119)), "numbers are not exactly 1..118")

    positions = [(e["xpos"], e["ypos"]) for e in elements]
    check(len(set(positions)) == len(positions), "duplicate xpos/ypos positions")

    symbols = [e["symbol"] for e in elements]
    check(len(set(symbols)) == len(symbols), "duplicate symbols")

    for e in elements:
        tag = f"{e['number']} {e['symbol']}"
        check(sum(e["shells"]) == e["number"], f"{tag}: sum(shells)={sum(e['shells'])}")
        check(1 <= e["xpos"] <= 18 and 1 <= e["ypos"] <= 10, f"{tag}: bad position")
        check(e["category"] is not None, f"{tag}: missing category")
        check(e["mass"] is not None and e["mass"] > 0, f"{tag}: bad mass")
        for key in ("electronegativity", "atomicRadius", "density",
                    "meltingPointK", "boilingPointK"):
            value = e[key]
            check(value is None or value > 0, f"{tag}: {key}={value} should be > 0 or null")

    categories = sorted({e["category"] for e in elements})
    print(f"elements.json: {len(elements)} elements, {len(categories)} categories")
    for c in categories:
        print(f"  - {c}: {sum(1 for e in elements if e['category'] == c)}")
    return {e["number"] for e in elements}


def validate_spectra(numbers):
    path = DATA / "spectra.json"
    if not path.exists():
        errors.append("spectra.json missing")
        return
    spectra = json.loads(path.read_text(encoding="utf-8"))
    for z, entry in spectra.items():
        check(int(z) in numbers, f"spectra: unknown element {z}")
        for wl, rel in entry["lines"]:
            check(380 <= wl <= 750, f"spectra {z}: wavelength {wl} out of range")
            check(0 < rel <= 1, f"spectra {z}: relative intensity {rel} out of range")
    print(f"spectra.json: {len(spectra)} elements with visible lines")


def validate_timeline(numbers):
    path = DATA / "timeline.json"
    if not path.exists():
        errors.append("timeline.json missing")
        return
    timeline = json.loads(path.read_text(encoding="utf-8"))
    times = [step["t"] for step in timeline["steps"]]
    check(times == sorted(times), "timeline: times are not increasing")
    for step in timeline["steps"]:
        check(step["z"] in numbers, f"timeline: unknown element {step['z']}")
    print(f"timeline.json: {len(timeline['steps'])} steps")


if __name__ == "__main__":
    nums = validate_elements()
    validate_spectra(nums)
    validate_timeline(nums)
    if errors:
        print(f"\nFAILED with {len(errors)} problem(s):")
        for err in errors:
            print("  x", err)
        sys.exit(1)
    print("\nAll checks passed.")
