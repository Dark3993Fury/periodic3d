// Toolbar + search box. Emits user intents through callbacks; owns no app logic.

import { esc } from '../utils/format.js';

const ALIASES = { aluminium: 13, caesium: 55, sulphur: 16 };
const AUTO_SELECT_DELAY = 650; // ms after typing an exact match

export function findMatches(elements, query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  for (const el of elements) {
    const name = el.name.toLowerCase();
    const sym = el.symbol.toLowerCase();
    let score = -1;
    if (String(el.number) === q) score = 100;
    else if (sym === q) score = 95;
    else if (name === q || ALIASES[q] === el.number) score = 90;
    else if (name.startsWith(q)) score = 60;
    else if (sym.startsWith(q)) score = 50;
    else if (name.includes(q)) score = 30;
    if (score >= 0) results.push({ el, score });
  }
  results.sort((a, b) => b.score - a.score || a.el.number - b.el.number);
  return results.slice(0, limit);
}

export function createControls({ elements, onSearchSelect, onLayout, onColorMode, onTemperature, onReset, onTourToggle, onTourStop }) {
  const input = document.getElementById('search');
  const list = document.getElementById('search-results');
  let matches = [];
  let active = -1;
  let autoTimer = 0;

  function renderList() {
    if (!matches.length) {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    list.innerHTML = matches.map(({ el }, i) => `
      <li role="option" id="opt-${el.number}" data-z="${el.number}" aria-selected="${i === active}" class="${i === active ? 'active' : ''}">
        <span class="r-sym">${esc(el.symbol)}</span>
        <span class="r-name">${esc(el.name)}</span>
        <span class="r-num">${el.number}</span>
      </li>`).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', active >= 0 ? `opt-${matches[active].el.number}` : '');
  }

  function choose(el) {
    clearTimeout(autoTimer);
    matches = [];
    active = -1;
    renderList();
    input.value = '';
    input.blur();
    onSearchSelect(el.number);
  }

  input.addEventListener('input', () => {
    matches = findMatches(elements, input.value);
    active = matches.length ? 0 : -1;
    renderList();
    // Typing an exact symbol/name/number flies there after a short pause.
    clearTimeout(autoTimer);
    if (matches[0]?.score >= 90) {
      const target = matches[0].el;
      autoTimer = setTimeout(() => onSearchSelect(target.number, { keepSearch: true }), AUTO_SELECT_DELAY);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      active = (active + 1) % matches.length;
      renderList();
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      active = (active - 1 + matches.length) % matches.length;
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[active]) choose(matches[active].el);
    } else if (e.key === 'Escape') {
      matches = [];
      renderList();
      input.blur();
    }
  });

  // pointerdown (not click) so the choice lands before the input loses focus.
  list.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('li[data-z]');
    if (!li) return;
    e.preventDefault();
    choose(elements[Number(li.dataset.z) - 1]);
  });

  input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 120));
  input.addEventListener('focus', () => { if (matches.length) renderList(); });

  // ---- Layout buttons ----
  const layoutButtons = [...document.querySelectorAll('#layout-buttons button')];
  layoutButtons.forEach((btn) => btn.addEventListener('click', () => onLayout(btn.dataset.layout)));

  function setLayout(name) {
    layoutButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.layout === name)));
  }

  // ---- Colour mode + temperature ----
  const colorSelect = document.getElementById('color-mode');
  const tempWrap = document.getElementById('temp-wrap');
  const tempInput = document.getElementById('temperature');
  const tempOut = document.getElementById('temp-out');

  colorSelect.addEventListener('change', () => onColorMode(colorSelect.value));
  tempInput.addEventListener('input', () => onTemperature(Number(tempInput.value)));
  document.getElementById('temp-room').addEventListener('click', () => onTemperature(298));

  function setColorMode(mode) {
    colorSelect.value = mode;
    tempWrap.hidden = mode !== 'state';
  }

  function setTemperature(t) {
    tempInput.value = String(t);
    tempOut.textContent = `${Math.round(t)} K`;
  }

  // ---- Reset + tour ----
  document.getElementById('reset-view').addEventListener('click', () => onReset());
  const tourPlay = document.getElementById('tour-play');
  const tourStop = document.getElementById('tour-stop');
  tourPlay.addEventListener('click', () => onTourToggle());
  tourStop.addEventListener('click', () => onTourStop());

  function setTourState(status) {
    // status: 'stopped' | 'playing' | 'paused'
    tourPlay.dataset.state = status;
    tourPlay.querySelector('span').textContent = status === 'playing' ? 'Pause' : status === 'paused' ? 'Resume' : 'Song tour';
    tourPlay.setAttribute('aria-label', status === 'playing' ? 'Pause song tour' : 'Play song tour');
    tourStop.hidden = status === 'stopped';
  }

  function focusSearch() {
    input.focus();
    input.select();
  }

  return { setLayout, setColorMode, setTemperature, setTourState, focusSearch };
}
