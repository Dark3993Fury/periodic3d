// Legend: category chips (tap to highlight), heatmap scale bar, or states of matter.

import { CATEGORIES, STATES, rampGradientCSS, UNKNOWN_COLOR } from './colors.js';
import { esc, fmtNumber } from '../utils/format.js';

export function createLegend(el, { onCategoryToggle }) {
  el.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (chip) onCategoryToggle(chip.dataset.category);
  });

  function showCategories(activeCategory) {
    el.dataset.mode = 'category';
    el.innerHTML = `
      <div class="legend-title">Categories <span class="legend-hint">tap to highlight</span></div>
      <div class="legend-chips">
        ${CATEGORIES.map((c) => `
          <button type="button" class="legend-chip${activeCategory === c.name ? ' active' : ''}${activeCategory && activeCategory !== c.name ? ' muted' : ''}"
                  data-category="${esc(c.name)}" aria-pressed="${activeCategory === c.name}" style="--c:${c.color}">
            <span class="dot"></span>${esc(c.name)}
          </button>`).join('')}
      </div>`;
  }

  function showHeat(scale) {
    const { config, min, max } = scale;
    el.dataset.mode = 'heat';
    const mid = config.scale === 'log' ? Math.sqrt(min * max) : (min + max) / 2;
    el.innerHTML = `
      <div class="legend-title">${esc(config.label)} <span class="legend-hint">${esc(config.unit)}${config.scale === 'log' ? ' · log scale' : ''}</span></div>
      <div class="scale-bar" style="background:${rampGradientCSS()}"></div>
      <div class="scale-labels">
        <span>${fmtNumber(min, config.digits + 1)}</span>
        <span>${fmtNumber(mid, config.digits)}</span>
        <span>${fmtNumber(max, config.digits)}</span>
      </div>
      <div class="legend-chips"><span class="legend-chip static" style="--c:${UNKNOWN_COLOR}"><span class="dot"></span>unknown</span></div>`;
  }

  function showStates(temperature, counts) {
    el.dataset.mode = 'state';
    el.innerHTML = `
      <div class="legend-title">State at ${Math.round(temperature)} K <span class="legend-hint">${fmtNumber(temperature - 273.15, 0)} °C · 1 atm</span></div>
      <div class="legend-chips">
        ${Object.entries(STATES).map(([key, s]) => `
          <span class="legend-chip static" style="--c:${s.color}"><span class="dot"></span>${s.label}<b>${counts[key] ?? 0}</b></span>`).join('')}
      </div>`;
  }

  return { showCategories, showHeat, showStates };
}
