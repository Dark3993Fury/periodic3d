// Display formatting. Missing values always show as "unknown", never 0 or blank.

export const UNKNOWN = 'unknown';

export function fmtNumber(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return UNKNOWN;
  return String(Number(value.toFixed(digits)));
}

export function fmtWithUnit(value, unit, digits = 3) {
  if (value == null) return UNKNOWN;
  return `${fmtNumber(value, digits)} ${unit}`;
}

export function fmtTemperature(kelvin) {
  if (kelvin == null) return UNKNOWN;
  const c = kelvin - 273.15;
  return `${fmtNumber(kelvin, 2)} K (${fmtNumber(c, 1)} °C)`;
}

export function fmtDensity(value) {
  if (value == null) return UNKNOWN;
  // Gases have tiny densities: show more significant figures.
  const digits = value < 0.1 ? 6 : 3;
  return `${fmtNumber(value, digits)} g/cm³`;
}

export function fmtText(value) {
  return value == null || value === '' ? UNKNOWN : String(value);
}

/** Escape text for safe use inside innerHTML templates. */
export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "[Ar]4s2 3d6" -> "[Ar]4s² 3d⁶" */
export function prettyConfig(config) {
  if (!config) return UNKNOWN;
  const sup = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return config.replace(/([spdf])(\d+)/g, (_, orbital, n) => orbital + [...n].map((d) => sup[d]).join(''));
}
