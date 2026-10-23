// Song tour: plays "The Elements" and visits each element at its time in timeline.json.
// Audio is only requested when Play is pressed. If the MP3 is missing, the tour
// still runs on its own clock (silent mode).

export function createTour({ timeline, onStep, onStatus, onNotice }) {
  const steps = timeline?.steps ?? [];
  let audio = null;
  let silent = false;
  let status = 'stopped'; // stopped | playing | paused
  let index = 0;
  let clockStart = 0;     // performance.now() when silent playback (re)started
  let clockOffset = 0;    // seconds already played in silent mode
  let raf = 0;

  function now() {
    if (silent || !audio) return clockOffset + (status === 'playing' ? (performance.now() - clockStart) / 1000 : 0);
    return audio.currentTime;
  }

  function setStatus(next) {
    status = next;
    onStatus(next);
  }

  function tick() {
    if (status !== 'playing') return;
    const t = now();
    while (index < steps.length && steps[index].t <= t) {
      onStep(steps[index], index, steps.length);
      index += 1;
    }
    const lastT = steps.length ? steps[steps.length - 1].t : 0;
    const finished = silent || !audio ? t > lastT + 3 : audio.ended;
    if (finished) {
      stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  /** Jump index to the first step after the current time (after pause / edits). */
  function resync() {
    const t = now();
    index = steps.findIndex((s) => s.t > t);
    if (index < 0) index = steps.length;
  }

  async function startAudio() {
    if (silent) return false;
    if (!audio) {
      audio = new Audio(`${import.meta.env.BASE_URL}${timeline.audio}`);
      audio.preload = 'auto';
    }
    try {
      await audio.play();
      return true;
    } catch (err) {
      if (err?.name === 'NotAllowedError') throw err; // autoplay blocked: surface it
      audio = null;
      silent = true;
      onNotice('No song file found — playing a silent tour. Add public/audio/the-elements.mp3 to hear it.');
      return false;
    }
  }

  async function play() {
    if (!steps.length) {
      onNotice('Tour timeline is missing.');
      return;
    }
    if (status === 'playing') return;
    const wasStopped = status === 'stopped';
    setStatus('playing');
    if (wasStopped) {
      index = 0;
      clockOffset = 0;
      if (audio) audio.currentTime = 0;
      if (timeline.approximate) onNotice('Song tour: timings are approximate.');
    }
    try {
      const withAudio = await startAudio();
      if (status !== 'playing') { audio?.pause(); return; } // stopped while loading
      if (!withAudio) clockStart = performance.now();
    } catch {
      setStatus('paused');
      onNotice('Your browser blocked the audio. Press play again.');
      return;
    }
    resync();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (status !== 'playing') return;
    clockOffset = now();
    audio?.pause();
    cancelAnimationFrame(raf);
    setStatus('paused');
  }

  function stop() {
    cancelAnimationFrame(raf);
    audio?.pause();
    if (audio) audio.currentTime = 0;
    clockOffset = 0;
    index = 0;
    if (status !== 'stopped') setStatus('stopped');
  }

  function toggle() {
    if (status === 'playing') pause();
    else play();
  }

  // Pausing when the tab is hidden keeps audio and camera in step.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  return { play, pause, stop, toggle, get status() { return status; } };
}
