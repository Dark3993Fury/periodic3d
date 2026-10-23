// Draws an element's visible emission lines as coloured bars on a canvas.

import { wavelengthToRGB } from './colors.js';

const MIN_NM = 380;
const MAX_NM = 750;

export function drawSpectrum(canvas, entry) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 320;
  const h = canvas.clientHeight || 64;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const axisH = 16;
  const barH = h - axisH;
  const x = (nm) => ((nm - MIN_NM) / (MAX_NM - MIN_NM)) * w;

  // Background: near-black with a faint rainbow so the scale is readable.
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, w, barH);
  for (let px = 0; px < w; px++) {
    const nm = MIN_NM + (px / w) * (MAX_NM - MIN_NM);
    const [r, g, b] = wavelengthToRGB(nm);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.07)`;
    ctx.fillRect(px, 0, 1, barH);
  }

  if (entry?.lines?.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [nm, rel] of entry.lines) {
      const [r, g, b] = wavelengthToRGB(nm);
      const alpha = 0.35 + 0.65 * rel;
      const px = x(nm);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`;
      ctx.fillRect(px - 2.5, 0, 5, barH); // soft glow
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(px - 1, 0, 2, barH);
    }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = 'rgba(230, 233, 239, 0.55)';
    ctx.font = '500 12px "Inter Variable", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('no data', w / 2, barH / 2);
  }

  // Axis ticks.
  ctx.fillStyle = 'rgba(230, 233, 239, 0.5)';
  ctx.font = '500 10px "Inter Variable", system-ui, sans-serif';
  ctx.textBaseline = 'top';
  for (const nm of [400, 500, 600, 700]) {
    const px = x(nm);
    ctx.fillRect(px, barH, 1, 3);
    ctx.textAlign = 'center';
    ctx.fillText(`${nm}`, px, barH + 4);
  }
  ctx.textAlign = 'right';
  ctx.fillText('nm', w - 1, barH + 4);
}

export function spectrumDescription(entry, element) {
  if (!entry?.lines?.length) return `No visible emission line data for ${element.name}.`;
  const list = entry.lines.map(([nm]) => `${nm} nm`).join(', ');
  return `Visible emission lines of ${element.name}: ${list}.`;
}
