"""Convert scripts/raw/nist_visible_lines.json into public/data/spectra.json.

Raw file: strongest 15 observed lines per element in 380-750 nm (air), neutral
atoms (spectrum "I"), from the NIST Atomic Spectra Database, fetched with
scripts/fetch_nist_lines.js. Intensities are relative to the strongest line
of the same element (NIST intensities are not comparable between elements).

Clean-up done here:
  * lines closer than 0.05 nm (fine-structure duplicates) are merged, keeping the stronger
  * relative intensity is floored at 0.03 so faint lines stay visible as bars
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts/raw/nist_visible_lines.json"
OUT = ROOT / "public/data/spectra.json"
MERGE_NM = 0.05
MIN_REL = 0.03


def clean(lines):
    merged = []
    for wl, rel in sorted(lines):
        if merged and wl - merged[-1][0] < MERGE_NM:
            merged[-1][1] = max(merged[-1][1], rel)
        else:
            merged.append([wl, rel])
    return [[wl, round(max(rel, MIN_REL), 2)] for wl, rel in merged]


def main():
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    out = {
        z: {"ion": entry["ion"], "totalLines": entry["n"], "lines": clean(entry["lines"])}
        for z, entry in raw.items()
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(out)} elements to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
