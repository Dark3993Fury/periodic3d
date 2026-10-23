"""Build public/data/timeline.json for the song tour.

The element order follows Tom Lehrer's "The Elements" (1959), which Lehrer
placed in the public domain. Timings are APPROXIMATE (an even pace per verse)
and are meant to be tuned by ear against your recording: edit START, STEP and
the verse gaps below, or edit timeline.json directly.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ELEMENTS = json.loads((ROOT / "public/data/elements.json").read_text(encoding="utf-8"))
BY_NAME = {e["name"].lower(): e["number"] for e in ELEMENTS}
BY_NAME["aluminium"] = BY_NAME["aluminum"]

VERSES = [
    "antimony arsenic aluminum selenium hydrogen oxygen nitrogen rhenium "
    "nickel neodymium neptunium germanium iron americium ruthenium uranium "
    "europium zirconium lutetium vanadium lanthanum osmium astatine radium "
    "gold protactinium indium gallium iodine thorium thulium thallium "
    "yttrium ytterbium actinium rubidium boron gadolinium niobium iridium "
    "strontium silicon silver samarium bismuth bromine lithium beryllium barium",
    "holmium helium hafnium erbium phosphorus francium fluorine terbium "
    "manganese mercury molybdenum magnesium dysprosium scandium cerium cesium "
    "lead praseodymium platinum plutonium palladium promethium potassium "
    "polonium tantalum technetium titanium tellurium cadmium calcium chromium curium",
    "sulfur californium fermium berkelium mendelevium einsteinium nobelium "
    "argon krypton neon radon xenon zinc rhodium chlorine carbon cobalt "
    "copper tungsten tin sodium",
]

START = 6.0       # seconds before the first element (intro)
STEP = 0.72       # seconds per element name
VERSE_GAP = 4.0   # "These are the many..." refrain between verses


def main():
    steps, t = [], START
    for verse in VERSES:
        for name in verse.split():
            steps.append({"t": round(t, 2), "z": BY_NAME[name]})
            t += STEP
        t += VERSE_GAP
    zs = [s["z"] for s in steps]
    assert len(zs) == len(set(zs)), "an element appears twice"
    out = {
        "title": "The Elements — Tom Lehrer (public domain)",
        "audio": "audio/the-elements.mp3",
        "approximate": True,
        "steps": steps,
    }
    path = ROOT / "public/data/timeline.json"
    path.write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"Wrote {len(steps)} steps, ends at {steps[-1]['t']} s")


if __name__ == "__main__":
    main()
