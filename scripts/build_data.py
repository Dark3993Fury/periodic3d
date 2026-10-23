"""Merge PubChem CSV + Periodic-Table-JSON into public/data/elements.json.

Sources (both in scripts/raw/):
  pubchem.csv          -> https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/CSV (public domain)
  periodic-table.json  -> https://github.com/Bowserinator/Periodic-Table-JSON (CC BY-SA 3.0)

PubChem is the source for numeric properties and category.
Periodic-Table-JSON is the source for shells, grid position (xpos/ypos), period,
group, summary, appearance and discoverer.
Missing values become null. Nothing is invented here.
"""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts" / "raw"
OUT = ROOT / "public" / "data" / "elements.json"


def to_float(value):
    """Return a float, or None for blank / non-numeric values."""
    value = (value or "").strip()
    if value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def to_text(value):
    value = (value or "").strip() if isinstance(value, str) else value
    return value if value not in ("", None) else None


def year_discovered(value):
    """PubChem gives a year or the word 'Ancient'."""
    value = (value or "").strip()
    if value.isdigit():
        return int(value)
    return value or None


def clean_config(value):
    """Remove stray spaces such as '[He] 2s2 2p3' -> '[He]2s2 2p3'."""
    value = to_text(value)
    if value is None:
        return None
    return value.replace("] ", "]")


def load_pubchem():
    with open(RAW / "pubchem.csv", newline="", encoding="utf-8") as f:
        return {int(row["AtomicNumber"]): row for row in csv.DictReader(f)}


def load_ptjson():
    with open(RAW / "periodic-table.json", encoding="utf-8") as f:
        elements = json.load(f)["elements"]
    return {e["number"]: e for e in elements if e["number"] <= 118}


def merge(pc, pt):
    state = to_text(pc["StandardState"])
    return {
        "number": int(pc["AtomicNumber"]),
        "symbol": pc["Symbol"].strip(),
        "name": pc["Name"].strip(),
        "category": to_text(pc["GroupBlock"]),
        "mass": to_float(pc["AtomicMass"]),
        "electronConfiguration": clean_config(pc["ElectronConfiguration"]),
        "shells": pt["shells"],
        "xpos": pt["xpos"],
        "ypos": pt["ypos"],
        "period": pt["period"],
        "group": pt["group"],
        "block": to_text(pt.get("block")),
        "electronegativity": to_float(pc["Electronegativity"]),
        "atomicRadius": to_float(pc["AtomicRadius"]),          # pm
        "ionizationEnergy": to_float(pc["IonizationEnergy"]),  # eV
        "electronAffinity": to_float(pc["ElectronAffinity"]),  # eV
        "oxidationStates": to_text(pc["OxidationStates"]),
        "standardState": state,
        "density": to_float(pc["Density"]),                    # g/cm3
        "meltingPointK": to_float(pc["MeltingPoint"]),
        "boilingPointK": to_float(pc["BoilingPoint"]),
        "yearDiscovered": year_discovered(pc["YearDiscovered"]),
        "discoveredBy": to_text(pt.get("discovered_by")),
        "appearance": to_text(pt.get("appearance")),
        "summary": to_text(pt.get("summary")),
    }


def main():
    pubchem = load_pubchem()
    ptjson = load_ptjson()
    missing = sorted(set(pubchem) ^ set(ptjson))
    if missing:
        raise SystemExit(f"Sources disagree on element numbers: {missing}")

    elements = [merge(pubchem[z], ptjson[z]) for z in sorted(pubchem)]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(elements, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(elements)} elements to {OUT.relative_to(ROOT)} "
          f"({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
