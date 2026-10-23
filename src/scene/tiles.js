// The 118 element tiles: creation, layout transitions, colouring, selection, picking.

import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { tween, cancelTween, easeInOutCubic } from '../utils/tween.js';
import { esc, fmtNumber } from '../utils/format.js';

const TAP_MAX_MOVE = 8;     // px; more than this is a drag, not a tap
const TAP_MAX_TIME = 600;   // ms

export function createTiles(scene, elements, layouts) {
  const tiles = elements.map((el) => {
    const root = document.createElement('div');
    root.className = 'tile';
    root.dataset.z = String(el.number);

    const face = document.createElement('div');
    face.className = 'tile-face';
    face.setAttribute('role', 'button');
    face.setAttribute('aria-label', `${el.name}, atomic number ${el.number}`);
    face.innerHTML = `
      <span class="t-num">${el.number}</span>
      <span class="t-sym">${esc(el.symbol)}</span>
      <span class="t-name">${esc(el.name)}</span>
      <span class="t-val">${fmtNumber(el.mass, 3)}</span>`;
    root.appendChild(face);

    // Plain tinted back, so tiles seen from behind (sphere, helix) show no mirrored text.
    const back = document.createElement('div');
    back.className = 'tile-back';
    root.appendChild(back);

    const object = new CSS3DObject(root);
    scene.add(object);
    return { el, root, face, object, valueEl: face.querySelector('.t-val') };
  });

  const byNumber = new Map(tiles.map((t) => [t.el.number, t]));
  let layoutJob = null;
  let currentLayout = 'table';

  /** Scatter tiles randomly (used for the intro animation). */
  function scatter() {
    for (const t of tiles) {
      t.object.position.set(
        (Math.random() - 0.5) * 6000,
        (Math.random() - 0.5) * 6000,
        (Math.random() - 0.5) * 6000 - 1000,
      );
      t.object.quaternion.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0));
    }
  }

  /** Move every tile to `name` layout over `duration` ms. */
  function applyLayout(name, duration = 1500) {
    currentLayout = name;
    cancelTween(layoutJob);
    const targets = layouts[name];
    const from = tiles.map((t) => ({ p: t.object.position.clone(), q: t.object.quaternion.clone() }));
    layoutJob = tween({
      duration,
      easing: easeInOutCubic,
      onUpdate: (k) => {
        tiles.forEach((t, i) => {
          t.object.position.lerpVectors(from[i].p, targets[i].position, k);
          t.object.quaternion.slerpQuaternions(from[i].q, targets[i].quaternion, k);
        });
      },
    });
  }

  /** Where tile `z` sits (and faces) in the current layout. */
  function placement(z) {
    const index = tiles.indexOf(byNumber.get(z));
    return layouts[currentLayout][index];
  }

  /**
   * Colour every tile. styleFn(element) -> { color: '#rrggbb', value: 'text', dim: bool }.
   */
  function paint(styleFn, rgbaFn) {
    for (const t of tiles) {
      const s = styleFn(t.el);
      const st = t.root.style;
      st.setProperty('--tile-bg', rgbaFn(s.color, s.bgAlpha ?? 0.2));
      st.setProperty('--tile-border', rgbaFn(s.color, 0.7));
      st.setProperty('--tile-glow', rgbaFn(s.color, 0.55));
      st.setProperty('--tile-back', rgbaFn(s.color, 0.14));
      st.setProperty('--tile-accent', s.color);
      t.face.classList.toggle('on-light', Boolean(s.lightBg));
      t.valueEl.textContent = s.value;
      t.root.classList.toggle('dim', Boolean(s.dim));
    }
  }

  let selectedTile = null;
  function setSelected(z) {
    selectedTile?.root.classList.remove('selected');
    selectedTile = z == null ? null : byNumber.get(z) ?? null;
    selectedTile?.root.classList.add('selected');
  }

  /** Short highlight pulse (song tour). */
  function pulse(z) {
    const t = byNumber.get(z);
    if (!t) return;
    t.root.classList.remove('pulse');
    void t.root.offsetWidth; // restart the CSS animation
    t.root.classList.add('pulse');
  }

  /**
   * Tap/click picking. OrbitControls captures the pointer, so we decide on
   * pointerup whether the gesture was a tap on a tile (or on empty space).
   */
  function onPick(domElement, callback) {
    let down = null;
    domElement.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) { down = null; return; }
      const tileEl = e.target.closest?.('.tile');
      down = { x: e.clientX, y: e.clientY, time: performance.now(), z: tileEl ? Number(tileEl.dataset.z) : null };
    }, true);
    domElement.addEventListener('pointerup', (e) => {
      if (!down || !e.isPrimary) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.time < TAP_MAX_TIME;
      if (moved <= TAP_MAX_MOVE && quick) callback(down.z);
      down = null;
    }, true);
    domElement.addEventListener('pointercancel', () => { down = null; }, true);
  }

  return { tiles, byNumber, scatter, applyLayout, placement, paint, setSelected, pulse, onPick, get layout() { return currentLayout; } };
}
