"""Build public/data/timeline.json for the song tour.

The element order follows Tom Lehrer's "The Elements" (1959).

Timing comes from a subtitle file of the recording (scripts/raw/the-elements.srt).
Each subtitle line (cue) has a start and end time and some element names.
Inside a cue, each element's time is estimated from where its name appears in
the text (names further along the line are sung later). Speech-to-text gets
some names wrong, so ALIASES maps garbled words to the real element, and an
element missing from the text gets a time halfway between its neighbours.

No SRT? It falls back to an even pace (START / STEP / VERSE_GAP).

Fine-tune with LEAD (seconds the camera starts early, so it lands on the word),
or edit the "t" values in timeline.json directly.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ELEMENTS = json.loads((ROOT / "public/data/elements.json").read_text(encoding="utf-8"))
BY_NAME = {e["name"].lower(): e["number"] for e in ELEMENTS}
SRT = ROOT / "scripts/raw/the-elements.srt"
AUDIO = "audio/1-16_The_Elements.mp3"   # path inside public/

LEAD = 0.25  # seconds; camera flight takes ~0.5 s

# Elements per subtitle cue, in song order. Must match the SRT's cue layout.
CUES = [
    "antimony arsenic aluminum selenium hydrogen oxygen",
    "nitrogen rhenium nickel neodymium neptunium germanium iron",
    "americium ruthenium uranium europium zirconium lutetium vanadium",
    "lanthanum osmium astatine radium gold protactinium",
    "indium gallium iodine thorium thulium thallium",
    "yttrium ytterbium actinium rubidium boron gadolinium niobium",
    "iridium strontium silicon silver samarium bismuth bromine",
    "lithium beryllium barium",
    "holmium helium hafnium erbium phosphorus francium",
    "fluorine terbium manganese mercury molybdenum magnesium",
    "dysprosium scandium cerium cesium lead praseodymium platinum",
    "plutonium palladium promethium potassium polonium tantalum technetium",
    "titanium tellurium cadmium calcium chromium curium",
    "sulfur californium fermium berkelium mendelevium",
    "einsteinium nobelium argon krypton neon radon xenon zinc rhodium",
    "chlorine carbon cobalt copper tungsten tin sodium",
]

# How the transcript spelled names it misheard.
ALIASES = {
    "lutetium": ["ruticium"],
    "protactinium": ["propdactinium"],
    "bismuth": ["bisethromine", "bis"],
    "bromine": ["romine"],
    "mercury": ["merconium", "merc"],
}

# Even-pace fallback (used only without an SRT).
START, STEP, VERSE_GAP = 6.0, 0.72, 4.0


def parse_time(stamp):
    h, m, rest = stamp.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def read_srt(path):
    """Return cues [(start, end, text)] that contain lyrics (skips notes in brackets)."""
    blocks = re.split(r"\n\s*\n", path.read_text(encoding="utf-8-sig").strip())
    cues = []
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        timing = next((l for l in lines if "-->" in l), None)
        if not timing:
            continue
        start, end = (parse_time(t.strip()) for t in timing.split("-->"))
        text = " ".join(l for l in lines[lines.index(timing) + 1:])
        if end > start and not text.startswith("("):
            cues.append((start, end, text))
    return cues


def find_position(text, name, after):
    """Character index of `name` (or an alias) in text, searching from `after`."""
    for word in [name] + ALIASES.get(name, []):
        i = text.find(word, after)
        if i >= 0:
            return i
    return None


def times_from_srt():
    srt_cues = read_srt(SRT)
    element_cues = [c for c in srt_cues if any(n in c[2].lower() for n in ("ium", "gen", "iron", "gold", "lead", "zinc", "tin"))]
    if len(element_cues) != len(CUES):
        raise SystemExit(f"SRT has {len(element_cues)} element lines, expected {len(CUES)}. Check CUES.")

    steps = []
    for (start, end, text), names in zip(element_cues, CUES):
        lower = text.lower()
        positions, cursor = [], 0
        for name in names.split():
            pos = find_position(lower, name, cursor)
            positions.append(pos)
            if pos is not None:
                cursor = pos + 1
        # Fill names the transcript missed: halfway between known neighbours.
        for i, pos in enumerate(positions):
            if pos is None:
                prev = next((positions[j] for j in range(i - 1, -1, -1) if positions[j] is not None), 0)
                nxt = next((positions[j] for j in range(i + 1, len(positions)) if positions[j] is not None), len(lower))
                positions[i] = (prev + nxt) / 2
                print(f"  note: '{name_at(names, i)}' not in transcript, interpolated")
        for name, pos in zip(names.split(), positions):
            t = start + (end - start) * pos / max(1, len(lower)) - LEAD
            steps.append({"t": round(max(0.0, t), 2), "z": BY_NAME[name]})
    return steps


def name_at(names, i):
    return names.split()[i]


def times_even():
    steps, t = [], START
    for verse in (CUES[:8], CUES[8:13], CUES[13:]):
        for cue in verse:
            for name in cue.split():
                steps.append({"t": round(t, 2), "z": BY_NAME[name]})
                t += STEP
        t += VERSE_GAP
    return steps


def main():
    synced = SRT.exists()
    steps = times_from_srt() if synced else times_even()
    zs = [s["z"] for s in steps]
    assert len(zs) == 102 and len(set(zs)) == 102, "song should name 102 different elements"
    steps.sort(key=lambda s: s["t"])
    out = {
        "title": "The Elements — Tom Lehrer",
        "audio": AUDIO,
        "approximate": not synced,
        "steps": steps,
    }
    (ROOT / "public/data/timeline.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"Wrote {len(steps)} steps ({'synced to SRT' if synced else 'even pace'}), "
          f"first {steps[0]['t']} s, last {steps[-1]['t']} s")


if __name__ == "__main__":
    main()
