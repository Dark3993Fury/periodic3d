// Detail panel: facts, Bohr atom view and emission spectrum for the selected element.

import { createAtomView } from '../scene/atom.js';
import { drawSpectrum, spectrumDescription } from './spectrum.js';
import { categoryColor, rgba } from './colors.js';
import {
  esc, fmtNumber, fmtWithUnit, fmtTemperature, fmtDensity, fmtText, prettyConfig, UNKNOWN,
} from '../utils/format.js';

export function createPanel({ panelEl, bodyEl, spectra, webgl, lowDetail, reducedMotion, onClose, onStep, onShare }) {
  // Static skeleton; only the contents change per element.
  bodyEl.innerHTML = `
    <div class="p-head">
      <div class="p-tile" id="p-tile"><span class="p-num"></span><span class="p-sym"></span></div>
      <div class="p-title">
        <h2 id="p-name"></h2>
        <span class="chip" id="p-cat"></span>
      </div>
      <div class="p-actions">
        <button type="button" class="icon-btn" id="p-prev" aria-label="Previous element">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" class="icon-btn" id="p-next" aria-label="Next element">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" class="icon-btn" id="p-share" aria-label="Copy link to this element">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <button type="button" class="icon-btn" id="p-close" aria-label="Close details">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>

    <section class="p-section">
      <div class="p-label"><span>Bohr model</span><span class="tag">simplified</span></div>
      <div class="atom-wrap">
        <canvas id="atom-canvas" aria-hidden="true"></canvas>
        <p class="atom-fallback" id="atom-fallback" hidden>This browser can’t show the 3D atom (WebGL is unavailable). Everything else still works.</p>
        <span class="shells" id="p-shells"></span>
      </div>
    </section>

    <section class="p-section">
      <div class="p-label"><span>Emission spectrum</span><span class="tag">simplified</span></div>
      <canvas id="spectrum-canvas" class="spectrum" role="img"></canvas>
      <p class="p-note" id="p-spec-note"></p>
    </section>

    <section class="p-section">
      <dl class="facts" id="p-facts"></dl>
    </section>

    <section class="p-section">
      <p class="summary" id="p-summary"></p>
      <p class="p-note">Summary: Wikipedia via Periodic-Table-JSON (CC BY-SA 3.0). Properties: PubChem.</p>
    </section>`;

  const $ = (id) => bodyEl.querySelector(`#${id}`);
  const atomCanvas = $('atom-canvas');
  const specCanvas = $('spectrum-canvas');
  const atom = webgl ? createAtomView(atomCanvas, { lowDetail, reducedMotion }) : null;
  if (!atom) {
    atomCanvas.hidden = true;
    $('atom-fallback').hidden = false;
  }

  let current = null;
  let currentSpectrum = null;

  $('p-close').addEventListener('click', () => onClose());
  $('p-prev').addEventListener('click', () => current && onStep(current.number - 1));
  $('p-next').addEventListener('click', () => current && onStep(current.number + 1));
  $('p-share').addEventListener('click', () => current && onShare(current));

  function factRows(el) {
    const discovered = el.yearDiscovered == null
      ? UNKNOWN
      : `${el.yearDiscovered}${el.discoveredBy && el.yearDiscovered !== 'Ancient' ? ` · ${el.discoveredBy}` : ''}`;
    const rows = [
      ['Atomic number', el.number],
      ['Atomic mass', fmtWithUnit(el.mass, 'u', 4)],
      ['Electron configuration', prettyConfig(el.electronConfiguration)],
      ['Group · Period · Block', `${el.group ?? '–'} · ${el.period} · ${el.block ?? '–'}`],
      ['Standard state', fmtText(el.standardState)],
      ['Electronegativity', fmtNumber(el.electronegativity, 2)],
      ['Atomic radius', fmtWithUnit(el.atomicRadius, 'pm', 0)],
      ['Ionization energy', fmtWithUnit(el.ionizationEnergy, 'eV', 3)],
      ['Electron affinity', fmtWithUnit(el.electronAffinity, 'eV', 3)],
      ['Density', fmtDensity(el.density)],
      ['Melting point', fmtTemperature(el.meltingPointK)],
      ['Boiling point', fmtTemperature(el.boilingPointK)],
      ['Oxidation states', fmtText(el.oxidationStates)],
      ['Discovered', discovered],
      ['Appearance', fmtText(el.appearance)],
    ];
    return rows
      .map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd${v === UNKNOWN ? ' class="unknown"' : ''}>${esc(v)}</dd></div>`)
      .join('');
  }

  function show(el) {
    current = el;
    const color = categoryColor(el.category);
    const tile = $('p-tile');
    tile.style.setProperty('--c', color);
    tile.style.setProperty('--c-bg', rgba(color, 0.18));
    tile.querySelector('.p-num').textContent = el.number;
    tile.querySelector('.p-sym').textContent = el.symbol;
    $('p-name').textContent = el.name;
    const cat = $('p-cat');
    cat.textContent = el.category ?? UNKNOWN;
    cat.style.setProperty('--c', color);
    $('p-prev').disabled = el.number <= 1;
    $('p-next').disabled = el.number >= 118;

    $('p-shells').textContent = `Shells: ${el.shells.join(' · ')}`;
    $('p-facts').innerHTML = factRows(el);
    $('p-summary').textContent = el.summary ?? 'No summary available.';

    currentSpectrum = spectra[el.number] ?? null;
    specCanvas.setAttribute('aria-label', spectrumDescription(currentSpectrum, el));
    $('p-spec-note').textContent = currentSpectrum
      ? `Strongest ${currentSpectrum.lines.length} visible lines of neutral ${el.symbol} (NIST ASD). Brightness is relative within this element.`
      : `NIST has no observed visible lines for neutral ${el.symbol}.`;

    panelEl.hidden = false;
    panelEl.classList.add('open');
    document.body.classList.add('panel-open');
    bodyEl.scrollTop = 0;
    // Draw after layout so canvases have their CSS size.
    requestAnimationFrame(() => {
      drawSpectrum(specCanvas, currentSpectrum);
      atom?.show(el, color);
    });
  }

  function hide() {
    current = null;
    panelEl.classList.remove('open');
    panelEl.hidden = true;
    document.body.classList.remove('panel-open');
  }

  function update(dt) {
    if (current && atom) atom.update(dt);
  }

  window.addEventListener('resize', () => {
    if (current) drawSpectrum(specCanvas, currentSpectrum);
  });

  return { show, hide, update, get current() { return current; }, get isOpen() { return Boolean(current); } };
}
