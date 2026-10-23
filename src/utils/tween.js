// Minimal tween runner. Jobs are advanced by updateTweens(now) from the main loop.

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const active = new Set();

/**
 * Start a tween. onUpdate(k) receives eased progress 0..1.
 * A duration of 0 (e.g. reduced motion) completes immediately.
 */
export function tween({ duration, onUpdate, onComplete, easing = easeInOutCubic }) {
  const job = { start: performance.now(), duration, onUpdate, onComplete, easing };
  if (!duration || duration <= 0) {
    onUpdate(1);
    onComplete?.();
    return job;
  }
  active.add(job);
  return job;
}

export function cancelTween(job) {
  if (job) active.delete(job);
}

export function updateTweens(now) {
  for (const job of active) {
    const t = Math.min(1, (now - job.start) / job.duration);
    job.onUpdate(job.easing(t));
    if (t >= 1) {
      active.delete(job);
      job.onComplete?.();
    }
  }
}

export function hasActiveTweens() {
  return active.size > 0;
}
