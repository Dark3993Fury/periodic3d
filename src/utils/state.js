// Tiny app state store: selection, layout, colour mode, temperature.
// Also owns the URL hash (#Fe) and localStorage preferences.

const PREFS_KEY = 'periodic3d:prefs:v1';

const state = {
  selected: null,        // atomic number or null
  layout: 'table',       // table | sphere | helix | grid
  colorMode: 'category', // category | state | heat:<property>
  temperature: 298,      // kelvin, used by colorMode "state"
  categoryFilter: null,  // category name highlighted from the legend
};

const listeners = new Map(); // key -> Set<fn>

export function getState() {
  return state;
}

/** Merge a patch into state and notify listeners of keys that changed. */
export function setState(patch) {
  const changed = [];
  for (const [key, value] of Object.entries(patch)) {
    if (state[key] !== value) {
      state[key] = value;
      changed.push(key);
    }
  }
  for (const key of changed) {
    listeners.get(key)?.forEach((fn) => fn(state[key], state));
  }
}

/** Call fn(value, state) whenever state[key] changes. Returns an unsubscribe function. */
export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

// ---- localStorage (per-viewer convenience only; may be unavailable) ----

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrefs() {
  try {
    const { layout, colorMode, temperature } = state;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ layout, colorMode, temperature }));
  } catch {
    /* private mode or blocked storage: ignore */
  }
}

// ---- URL hash: "#Fe" or "#26" ----

export function readHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1)).trim();
  } catch {
    return '';
  }
}

export function writeHash(symbol) {
  const base = window.location.pathname + window.location.search;
  const url = symbol ? `${base}#${symbol}` : base;
  if (url !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.replaceState(null, '', url);
  }
}
