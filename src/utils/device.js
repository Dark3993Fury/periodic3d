// Device and preference checks.

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

export function onReducedMotionChange(fn) {
  reducedMotionQuery.addEventListener?.('change', () => fn(reducedMotionQuery.matches));
}

/** Mobile layout = narrow screen; panel becomes a bottom sheet. */
export function isNarrowScreen() {
  return window.matchMedia('(max-width: 760px)').matches;
}

/**
 * Low-detail mode for phones and weak devices.
 * Override with ?hd (force full detail) or ?lite (force low detail).
 */
export function isLowDetail() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('hd')) return false;
  if (params.has('lite')) return true;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 768;
  const fewCores = (navigator.hardwareConcurrency || 8) <= 4;
  return (coarse && smallScreen) || fewCores;
}

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}
