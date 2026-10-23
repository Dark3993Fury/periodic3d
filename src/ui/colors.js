// Colour logic: categories, heatmaps, states of matter, wavelength -> RGB.
// Pure functions only (no DOM), so every view colours things the same way.

export const CATEGORIES = [
  { name: 'Alkali metal', color: '#ff6b6b' },
  { name: 'Alkaline earth metal', color: '#ffa94d' },
  { name: 'Transition metal', color: '#fcc419' },
  { name: 'Post-transition metal', color: '#51cf66' },
  { name: 'Metalloid', color: '#20c997' },
  { name: 'Nonmetal', color: '#4dabf7' },
  { name: 'Halogen', color: '#748ffc' },
  { name: 'Noble gas', color: '#b197fc' },
  { name: 'Lanthanide', color: '#f783ac' },
  { name: 'Actinide', color: '#a9e34b' },
];

export const UNKNOWN_COLOR = '#5b6170';

const categoryMap = new Map(CATEGORIES.map((c) => [c.name, c.color]));

export function categoryColor(category) {
  return categoryMap.get(category) ?? UNKNOWN_COLOR;
}

// ---- Heatmaps ----

export const HEATMAPS = {
  electronegativity: { label: 'Electronegativity', unit: '(Pauling)', scale: 'linear', digits: 2 },
  atomicRadius: { label: 'Atomic radius', unit: 'pm', scale: 'linear', digits: 0 },
  density: { label: 'Density', unit: 'g/cm³', scale: 'log', digits: 3 },
  meltingPointK: { label: 'Melting point', unit: 'K', scale: 'linear', digits: 0 },
  ionizationEnergy: { label: 'Ionization energy', unit: 'eV', scale: 'linear', digits: 2 },
};

// Viridis-like ramp: perceptually ordered, readable on dark backgrounds.
const RAMP = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];

export function rampGradientCSS() {
  return `linear-gradient(90deg, ${RAMP.join(', ')})`;
}

/** Build a scale for one property: { min, max, norm(value) -> 0..1 }. */
export function makeHeatScale(elements, key) {
  const config = HEATMAPS[key];
  const values = elements.map((e) => e[key]).filter((v) => v != null && v > 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const log = config.scale === 'log';
  const lo = log ? Math.log10(min) : min;
  const hi = log ? Math.log10(max) : max;
  const norm = (v) => {
    if (v == null || !(v > 0)) return null;
    const x = log ? Math.log10(v) : v;
    return hi === lo ? 0.5 : (x - lo) / (hi - lo);
  };
  return { key, config, min, max, norm };
}

export function heatColor(t) {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  return mixHex(RAMP[i], RAMP[i + 1], x - i);
}

// ---- States of matter ----

export const STATES = {
  solid: { label: 'Solid', color: '#8fa8c8' },
  liquid: { label: 'Liquid', color: '#3ad1e6' },
  gas: { label: 'Gas', color: '#ff922b' },
  unknown: { label: 'Unknown', color: UNKNOWN_COLOR },
};

/**
 * State at temperature T (K), at standard pressure, from melting/boiling points.
 * If the melting point is above the boiling point (e.g. arsenic sublimes),
 * it is solid below the boiling point and gas above it.
 */
export function stateAt(element, T) {
  const mp = element.meltingPointK;
  const bp = element.boilingPointK;
  if (mp == null) return 'unknown';
  if (bp != null && mp >= bp) return T < bp ? 'solid' : 'gas';
  if (T < mp) return 'solid';
  if (bp == null) return 'unknown';
  return T < bp ? 'liquid' : 'gas';
}

// ---- Spectrum colours ----

/** Approximate visible colour of a wavelength in nm (380-750). Returns [r, g, b] 0..255. */
export function wavelengthToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 750) { r = 1; }
  // Dim the edges of human vision.
  let f = 1;
  if (nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
  else if (nm > 700) f = 0.3 + (0.7 * (750 - nm)) / 50;
  const gamma = 0.8;
  const c = (v) => Math.round(255 * Math.pow(v * f, gamma));
  return [c(r), c(g), c(b)];
}

// ---- Helpers ----

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixHex(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}
