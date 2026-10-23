# Periodic 3D

An interactive 3D periodic table that runs in any browser. Drag to rotate, search, tap an element to see its atom and emission spectrum, switch layouts and heatmaps, or play the song tour.

**Live:** `https://<your-username>.github.io/periodic3d/`

## Features

- 118 elements in the standard layout, coloured by category, with a tappable legend
- Layouts: table, sphere, helix, grid (animated transitions)
- Colour modes: category, state of matter at any temperature (0–6000 K), and heatmaps for electronegativity, atomic radius, density (log scale), melting point and ionization energy
- Detail panel: facts, a simplified Bohr model and the element's visible emission lines (NIST)
- Search by symbol, name or number (`Fe`, `iron`, `26`)
- Shareable links: `.../periodic3d/#Fe` opens with iron selected
- Keyboard: arrows move around the table, `/` search, `Esc` close, `Space` play/pause tour
- Works on phones; automatic low-detail mode; respects “reduce motion”; works without WebGL (only the atom view needs it)
- Song tour of Tom Lehrer’s “The Elements” (silent tour if no MP3 is added)

## Run locally

Requires Node.js 20+ (22 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:5173/periodic3d/
npm run build      # production build into dist/
npm run preview    # serve dist/ exactly like GitHub Pages will
```

## Deploy to GitHub Pages

1. Create a **public** GitHub repo named exactly `periodic3d` (the name must match `base` in `vite.config.js`).
2. Push this folder to the `main` branch.
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Each push to `main` validates the data, builds and publishes. Watch it in the **Actions** tab.

Using a different repo name? Change `base` in `vite.config.js` to `'/<repo-name>/'`.

## Adding the song

The tour works without audio. To hear it, put a recording of “The Elements” at `public/audio/the-elements.mp3` (128 kbps is plenty). The element timings in `public/data/timeline.json` are **approximate**: tune them by ear, either by editing `START`, `STEP` and `VERSE_GAP` in `scripts/build_timeline.py` and running `python3 scripts/build_timeline.py`, or by editing the `t` values in the JSON directly.

Only commit an MP3 you have the right to publish.

## Data

Element data is never typed by hand. Scripts turn the raw source files in `scripts/raw/` into `public/data/*.json`:

```bash
npm run data   # build_data.py + build_spectra.py + validate_data.py
```

| File | Source | Licence |
| --- | --- | --- |
| `scripts/raw/pubchem.csv` | [PubChem Periodic Table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) — mass, configuration, electronegativity, radius, ionization energy, melting/boiling point, density, category, year discovered | Public domain (NIH) |
| `scripts/raw/periodic-table.json` | [Bowserinator/Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON) — shells, grid position, summary, appearance, discoverer | CC BY-SA 3.0 |
| `scripts/raw/nist_visible_lines.json` | [NIST Atomic Spectra Database](https://physics.nist.gov/asd) — 15 strongest observed lines per neutral atom in 380–750 nm, Z = 1–99 (fetched with `scripts/fetch_nist_lines.js`) | US Government work |

Notes:
- Because summaries and positions come from a CC BY-SA 3.0 source, the generated `public/data/elements.json` is shared under **CC BY-SA 3.0** too.
- Astatine and francium have no observed visible lines in NIST, and elements above 99 have none either; the panel shows “no data”.
- Missing values show as “unknown”, never 0.
- “State at temperature” is at 1 atm, from melting/boiling points. Arsenic’s listed melting point is above its boiling point (it sublimes), so it goes straight from solid to gas.

## Credits

Data: PubChem (NIH), Periodic-Table-JSON (CC BY-SA 3.0), NIST ASD. Song: “The Elements” by Tom Lehrer, placed in the public domain by the author. Built with [three.js](https://threejs.org).
