// Simplified Bohr model of the selected element, drawn in its own small WebGL canvas.
// Rings come from the element's `shells` array (electrons per shell).

import * as THREE from 'three';

const RING_GAP = 0.85;
const FIRST_RING = 1.35;

export function createAtomView(canvas, { lowDetail = false, reducedMotion = () => false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowDetail, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null; // caller shows a friendly message instead
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowDetail ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const light = new THREE.PointLight(0xffffff, 60, 0, 1.6);
  light.position.set(4, 5, 8);
  scene.add(light);

  const root = new THREE.Group();
  scene.add(root);

  // Shared geometry/material for electrons; rings and nucleus are rebuilt per element.
  const electronGeo = new THREE.SphereGeometry(0.15, lowDetail ? 8 : 14, lowDetail ? 6 : 10);
  const electronMat = new THREE.MeshBasicMaterial({ color: 0x3ad1e6 });
  let disposables = [];
  let shells = []; // { pivot, speed }
  let lost = false;

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; });

  function clear() {
    for (const child of [...root.children]) root.remove(child);
    disposables.forEach((d) => d.dispose());
    disposables = [];
    shells = [];
  }

  function ringGeometry(radius) {
    const points = [];
    const segments = lowDetail ? 64 : 128;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  /** Build the model for one element. `color` is the category colour (hex string). */
  function show(element, color) {
    clear();
    const tint = new THREE.Color(color);

    // Nucleus: slightly bigger for heavier atoms.
    const nucleusGeo = new THREE.SphereGeometry(0.42 + Math.cbrt(element.number) * 0.09, 24, 16);
    const nucleusMat = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, roughness: 0.4 });
    root.add(new THREE.Mesh(nucleusGeo, nucleusMat));
    disposables.push(nucleusGeo, nucleusMat);

    element.shells.forEach((count, i) => {
      const radius = FIRST_RING + i * RING_GAP;
      const tilt = new THREE.Group();
      // Each ring is tilted a little differently so the model reads as 3D.
      tilt.rotation.x = (i % 2 ? 0.16 : -0.12) * Math.min(1, i);
      tilt.rotation.y = (i % 3 - 1) * 0.14;
      root.add(tilt);

      const ringGeo = ringGeometry(radius);
      const ringMat = new THREE.LineBasicMaterial({ color: 0x8fa3bf, transparent: true, opacity: 0.38 });
      tilt.add(new THREE.LineLoop(ringGeo, ringMat));
      disposables.push(ringGeo, ringMat);

      const pivot = new THREE.Group();
      tilt.add(pivot);
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2;
        const e = new THREE.Mesh(electronGeo, electronMat);
        e.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        pivot.add(e);
      }
      // Inner shells orbit faster, alternating direction.
      shells.push({ pivot, speed: (1.4 / (i + 1)) * (i % 2 ? -1 : 1) });
    });

    // Frame the outermost ring.
    const outer = FIRST_RING + (element.shells.length - 1) * RING_GAP + 0.4;
    const dist = outer / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    root.rotation.set(0.55, 0, 0);
    render();
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function render() {
    if (lost) return;
    resize();
    renderer.render(scene, camera);
  }

  /** Advance the animation by dt seconds. */
  function update(dt) {
    if (!reducedMotion()) {
      for (const s of shells) s.pivot.rotation.z += s.speed * dt;
      root.rotation.y = Math.sin((performance.now() / 1000) * 0.35) * 0.45;
    }
    render();
  }

  return { show, update, render };
}
