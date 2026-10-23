// Keyboard shortcuts: arrows move the selection around the table grid,
// Esc closes, "/" focuses search, Space plays/pauses the tour.

/** Nearest element from `from` in direction (dx, dy) on the standard table grid. */
export function neighbor(elements, from, dx, dy) {
  if (!from) return elements[0];
  let best = null;
  let bestScore = Infinity;
  for (const el of elements) {
    if (el === from) continue;
    const ex = el.xpos - from.xpos;
    const ey = el.ypos - from.ypos;
    if (dx && (Math.sign(ex) !== dx || ey !== 0)) continue; // same row, right direction
    if (dy && Math.sign(ey) !== dy) continue;               // any column, right direction
    const score = dx ? Math.abs(ex) : Math.abs(ey) * 10 + Math.abs(ex);
    if (score < bestScore) { bestScore = score; best = el; }
  }
  // End of a row: continue with the next/previous atomic number.
  if (!best && dx) best = elements[from.number - 1 + dx] ?? null;
  return best;
}

export function bindKeyboard({ elements, getSelected, select, close, focusSearch, toggleTour }) {
  window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;

    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[e.key]) {
      e.preventDefault();
      const current = getSelected();
      const next = neighbor(elements, current ? elements[current - 1] : null, ...dirs[e.key]);
      if (next) select(next.number);
    } else if (e.key === 'Escape') {
      close();
    } else if (e.key === '/') {
      e.preventDefault();
      focusSearch();
    } else if (e.key === ' ' && tag !== 'BUTTON') {
      e.preventDefault();
      toggleTour();
    }
  });
}
