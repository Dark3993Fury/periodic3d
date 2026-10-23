// Entry point: loads data, builds the scene and UI, and wires modules together.

import '@fontsource-variable/inter';
import './ui/theme.css';
import * as THREE from 'three';

import { loadAll } from './data/loader.js';
import { createScene } from './scene/setup.js';
import { computeLayouts, LAYOUTS, FLAT_LAYOUTS, LAYOUT_BOUNDS } from './scene/layouts.js';
import { createTiles } from './scene/tiles.js';
import { createPanel } from './ui/panel.js';
import { createLegend } from './ui/legend.js';
import { createControls } from './ui/controls.js';
import { toast } from './ui/toast.js';
import {
  categoryColor, heatColor, makeHeatScale, rgba, stateAt, STATES, UNKNOWN_COLOR, HEATMAPS,
} from './ui/colors.js';
import { bindKeyboard } from './features/keyboard.js';
import { createTour } from './features/tour.js';
import { getState, setState, subscribe, loadPrefs, savePrefs, readHash, writeHash } from './utils/state.js';
import { updateTweens } from './utils/tween.js';
import { prefersReducedMotion, onReducedMotionChange, isLowDetail, isNarrowScreen, hasWebGL } from './utils/device.js';
import { fmtNumber } from './utils/format.js';

const INTRO_MS = 2200;
const LAYOUT_MS = 1500;

async function start() {
  const lowDetail = isLowDetail();
  const webgl = hasWebGL();
  document.body.classList.toggle('low-detail', lowDetail);
  const motion = (ms) => (prefersReducedMotion() ? 0 : lowDetail ? Math.round(ms * 0.8) : ms);

  let data;
  try {
    data = await loadAll();
  } catch (err) {
    showFatal(`Couldn't load the element data (${err.message}). Please refresh.`);
    return;
  }
  const { elements, spectra, timeline } = data;

  // ---- Scene ----
  const view = createScene(document.getElementById('scene'));
  const layouts = computeLayouts(elements);
  const tiles = createTiles(view.scene, elements, layouts);

  // ---- Restore preferences ----
  const prefs = loadPrefs();
  const validMode = (m) => m === 'category' || m === 'state' || (m?.startsWith('heat:') && HEATMAPS[m.slice(5)]);
  setState({
    layout: LAYOUTS.includes(prefs.layout) ? prefs.layout : 'table',
    colorMode: validMode(prefs.colorMode) ? prefs.colorMode : 'category',
    temperature: Number.isFinite(prefs.temperature) ? Math.min(6000, Math.max(0, prefs.temperature)) : 298,
  });

  // ---- Panel ----
  const panelEl = document.getElementById('panel');
  const panel = createPanel({
    panelEl,
    bodyEl: document.getElementById('panel-body'),
    spectra,
    webgl,
    lowDetail,
    reducedMotion: prefersReducedMotion,
    onClose: () => deselect(),
    onStep: (z) => select(z),
    onShare: (el) => shareLink(el),
  });

  // ---- Legend ----
  const legend = createLegend(document.getElementById('legend'), {
    onCategoryToggle: (cat) => setState({ categoryFilter: getState().categoryFilter === cat ? null : cat }),
  });

  // ---- Colouring ----
  function paint() {
    const { colorMode, temperature, categoryFilter } = getState();
    if (colorMode === 'state') {
      const counts = {};
      tiles.paint((el) => {
        const s = stateAt(el, temperature);
        counts[s] = (counts[s] ?? 0) + 1;
        return { color: STATES[s].color, value: STATES[s].label, bgAlpha: s === 'unknown' ? 0.12 : 0.3 };
      }, rgba);
      legend.showStates(temperature, counts);
    } else if (colorMode.startsWith('heat:')) {
      const scale = makeHeatScale(elements, colorMode.slice(5));
      tiles.paint((el) => {
        const v = el[scale.key];
        const t = scale.norm(v);
        if (t == null) return { color: UNKNOWN_COLOR, value: 'unknown', bgAlpha: 0.12 };
        return { color: heatColor(t), value: fmtNumber(v, scale.config.digits + (v < 1 ? 3 : 0)), bgAlpha: 0.62, lightBg: t > 0.72 };
      }, rgba);
      legend.showHeat(scale);
    } else {
      tiles.paint((el) => ({
        color: categoryColor(el.category),
        value: fmtNumber(el.mass, 3),
        dim: categoryFilter != null && el.category !== categoryFilter,
      }), rgba);
      legend.showCategories(categoryFilter);
    }
    updateViewShift();
  }

  // ---- Selection ----
  function flyToElement(z, { duration = 1000, distance } = {}) {
    const p = tiles.placement(z);
    const d = distance ?? (isNarrowScreen() ? 2400 : 1900);
    view.flyTo(p.position, p.normal, d, motion(duration));
  }

  /** Measure the UI around the edges so the 3D view is framed in the free area. */
  function updateViewShift() {
    const gap = 10;
    const toolbar = document.querySelector('.toolbar').getBoundingClientRect();
    const legendEl = document.getElementById('legend');
    const legendVisible = getComputedStyle(legendEl).display !== 'none'; // offsetParent is null for fixed elements
    const narrow = isNarrowScreen();
    const insets = { top: toolbar.bottom + gap, right: 0, bottom: 28, left: 0 };
    if (legendVisible) insets.bottom = window.innerHeight - legendEl.getBoundingClientRect().top + gap;
    if (panel.isOpen) {
      if (narrow) insets.bottom = panelEl.offsetHeight + gap;
      else insets.right = panelEl.offsetWidth + 16 + gap;
    }
    view.setInsets(insets);
  }

  function select(z, { fly = true } = {}) {
    if (!(z >= 1 && z <= elements.length)) return;
    if (tour.status !== 'stopped') tour.stop();
    const el = elements[z - 1];
    setState({ selected: z });
    tiles.setSelected(z);
    panel.show(el);
    updateViewShift();
    writeHash(el.symbol);
    view.setIdle(false);
    if (fly) flyToElement(z);
  }

  function deselect() {
    setState({ selected: null });
    tiles.setSelected(null);
    panel.hide();
    updateViewShift();
    writeHash('');
  }

  function goHome(duration = 1100) {
    const b = LAYOUT_BOUNDS[getState().layout];
    const dist = view.fitDistance(b.width, b.height) + b.front;
    view.flyTo(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1), dist, motion(duration));
  }

  async function shareLink(el) {
    const url = `${window.location.origin}${window.location.pathname}#${el.symbol}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(`Link copied: ${url}`);
    } catch {
      toast(url, 6000);
    }
  }

  function elementFromHash() {
    const q = readHash().toLowerCase();
    if (!q) return null;
    if (/^\d+$/.test(q)) return elements[Number(q) - 1] ?? null;
    return elements.find((e) => e.symbol.toLowerCase() === q || e.name.toLowerCase() === q) ?? null;
  }

  // ---- Tour ----
  const caption = document.getElementById('tour-caption');
  const tour = createTour({
    timeline,
    onStep: (step, i, total) => {
      const el = elements[step.z - 1];
      tiles.setSelected(el.number);
      tiles.pulse(el.number);
      flyToElement(el.number, { duration: 520, distance: isNarrowScreen() ? 2800 : 2200 });
      caption.innerHTML = `<span class="tc-sym" style="--c:${categoryColor(el.category)}">${el.symbol}</span>
        <span class="tc-name">${el.name}</span><span class="tc-count">${i + 1} / ${total}</span>`;
      caption.hidden = false;
    },
    onStatus: (status) => {
      controls.setTourState(status);
      document.body.classList.toggle('touring', status !== 'stopped');
      if (status === 'playing') {
        if (panel.isOpen) { panel.hide(); updateViewShift(); }
        view.setIdle(false);
      }
      if (status === 'stopped') {
        caption.hidden = true;
        tiles.setSelected(getState().selected);
        goHome();
      }
    },
    onNotice: (msg) => toast(msg, 4500),
  });

  // ---- Controls ----
  const controls = createControls({
    elements,
    onSearchSelect: (z) => select(z),
    onLayout: (name) => setState({ layout: name }),
    onColorMode: (mode) => setState({ colorMode: mode, categoryFilter: null }),
    onTemperature: (t) => setState({ temperature: t }),
    onReset: () => {
      if (tour.status !== 'stopped') tour.stop();
      if (panel.isOpen) deselect();
      goHome();
    },
    onTourToggle: () => tour.toggle(),
    onTourStop: () => tour.stop(),
  });

  // ---- State -> view ----
  subscribe('layout', (name) => {
    controls.setLayout(name);
    tiles.applyLayout(name, motion(LAYOUT_MS));
    if (view.isIdle()) view.setIdle(true, FLAT_LAYOUTS.has(name));
    const sel = getState().selected;
    if (sel && panel.isOpen) setTimeout(() => flyToElement(sel), motion(LAYOUT_MS) * 0.6);
    else goHome(motion(LAYOUT_MS));
    savePrefs();
  });
  subscribe('colorMode', (mode) => { controls.setColorMode(mode); paint(); savePrefs(); });
  subscribe('temperature', (t) => { controls.setTemperature(t); if (getState().colorMode === 'state') paint(); savePrefs(); });
  subscribe('categoryFilter', () => paint());

  const { layout, colorMode, temperature } = getState();
  controls.setLayout(layout);
  controls.setColorMode(colorMode);
  controls.setTemperature(temperature);
  paint();

  // ---- Picking ----
  tiles.onPick(view.renderer.domElement, (z) => {
    if (z) select(z);
    else if (panel.isOpen) deselect();
  });

  bindKeyboard({
    elements,
    getSelected: () => getState().selected,
    select,
    close: () => (tour.status !== 'stopped' ? tour.stop() : panel.isOpen && deselect()),
    focusSearch: () => controls.focusSearch(),
    toggleTour: () => tour.toggle(),
  });

  window.addEventListener('hashchange', () => {
    const el = elementFromHash();
    if (el && el.number !== getState().selected) select(el.number);
  });
  window.addEventListener('resize', () => updateViewShift());

  onReducedMotionChange((reduced) => { if (reduced) view.setIdle(false); });

  // ---- Intro ----
  const initial = elementFromHash();
  const introMs = motion(INTRO_MS);
  if (introMs) tiles.scatter();
  tiles.applyLayout(layout, introMs);
  goHome(0);
  if (initial) {
    // Deep link (#Fe): open straight away; the fly-in runs while tiles assemble.
    select(initial.number, { fly: false });
    setTimeout(() => flyToElement(initial.number), introMs * 0.5);
  } else if (!prefersReducedMotion()) {
    setTimeout(() => {
      // Idle rotation starts once tiles have landed, unless the user already acted.
      if (!getState().selected && tour.status === 'stopped') view.setIdle(true, FLAT_LAYOUTS.has(getState().layout));
    }, introMs);
  }

  if (!webgl) toast('3D atom view needs WebGL, which this browser has turned off. Everything else works.', 6000);

  // ---- Main loop (paused while the tab is hidden) ----
  const fpsEl = document.getElementById('fps');
  const showFps = import.meta.env.DEV;
  if (showFps) fpsEl.hidden = false;
  let frames = 0;
  let fpsTime = performance.now();
  let last = performance.now();
  let raf = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateTweens(now);
    view.update();
    panel.update(dt);
    if (showFps) {
      frames += 1;
      if (now - fpsTime >= 1000) {
        fpsEl.textContent = `${frames} fps`;
        frames = 0;
        fpsTime = now;
      }
    }
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });

  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => document.body.classList.remove('is-loading'));
}

function showFatal(message) {
  const loader = document.getElementById('loader');
  loader.innerHTML = `<p class="fatal">${message}</p>`;
  document.body.classList.remove('is-loading');
  loader.classList.add('error');
}

start();
