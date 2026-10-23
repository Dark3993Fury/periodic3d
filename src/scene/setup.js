// Renderer, camera, controls, resize, idle rotation and camera flights.
// Tiles are HTML elements placed in 3D with CSS3DRenderer (crisp text, no WebGL needed).

import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tween, cancelTween, easeInOutCubic } from '../utils/tween.js';

const FOV = 40;
const IDLE_SPEED = 0.35;      // OrbitControls autoRotateSpeed
const IDLE_SWAY_LIMIT = 0.38; // radians; flat layouts only sway, they never show their back

export function createScene(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 40000);
  camera.position.set(0, 0, 3200);

  const renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 1.1;
  controls.minDistance = 250;
  controls.maxDistance = 16000;
  controls.screenSpacePanning = true;

  let idleEnabled = false;   // auto-rotate until the user first touches
  let swayOnly = true;       // table/grid sway; sphere/helix spin fully
  let flight = null;         // active camera tween
  // Screen space covered by UI (toolbar, legend, panel). The picture is centred in what's left.
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };

  // First user interaction stops idle rotation for good and cancels any flight.
  controls.addEventListener('start', () => {
    idleEnabled = false;
    controls.autoRotate = false;
    cancelTween(flight);
    flight = null;
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    renderer.setSize(w, h);
    applyViewOffset();
    camera.updateProjectionMatrix();
  }

  function applyViewOffset() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = Math.round((insets.right - insets.left) / 2);
    const y = Math.round((insets.bottom - insets.top) / 2);
    if (x || y) camera.setViewOffset(w, h, x, y, w, h);
    else camera.clearViewOffset();
  }

  /** Tell the scene which screen edges are covered by UI, in px. */
  function setInsets(next) {
    Object.assign(insets, next);
    applyViewOffset();
    camera.updateProjectionMatrix();
  }

  /** Camera distance that fits a width x height box in the free screen area. */
  function fitDistance(width, height) {
    const visibleW = Math.max(120, window.innerWidth - insets.left - insets.right);
    const visibleH = Math.max(120, window.innerHeight - insets.top - insets.bottom);
    const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // Fraction of the full view height that is free, and the free area's aspect.
    const hFrac = visibleH / window.innerHeight;
    const dh = height / 2 / (half * hFrac);
    const dw = width / 2 / (half * hFrac * (visibleW / visibleH));
    return Math.max(dh, dw) * 1.04;
  }

  /** Animate camera to look at `target` from `target + normal * distance`. */
  function flyTo(target, normal, distance, duration = 1100) {
    cancelTween(flight);
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const toTarget = target.clone();
    const toPos = target.clone().add(normal.clone().normalize().multiplyScalar(distance));
    // Keep the camera's "up" sensible for tiles that face sideways (sphere/helix).
    camera.up.set(0, 1, 0);
    flight = tween({
      duration,
      easing: easeInOutCubic,
      onUpdate: (k) => {
        camera.position.lerpVectors(fromPos, toPos, k);
        controls.target.lerpVectors(fromTarget, toTarget, k);
      },
      onComplete: () => { flight = null; },
    });
  }

  function setIdle(enabled, layoutIsFlat) {
    idleEnabled = enabled;
    swayOnly = layoutIsFlat;
    controls.autoRotate = enabled;
    controls.autoRotateSpeed = IDLE_SPEED;
  }

  function isIdle() {
    return idleEnabled;
  }

  /** Called every frame. */
  function update() {
    if (idleEnabled && swayOnly) {
      const az = controls.getAzimuthalAngle();
      if (az > IDLE_SWAY_LIMIT) controls.autoRotateSpeed = Math.abs(IDLE_SPEED);
      else if (az < -IDLE_SWAY_LIMIT) controls.autoRotateSpeed = -Math.abs(IDLE_SPEED);
    }
    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);

  return { scene, camera, renderer, controls, update, resize, flyTo, fitDistance, setInsets, setIdle, isIdle };
}
