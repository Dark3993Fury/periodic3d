// Target positions + orientations for each layout. Pure geometry, no DOM.

import * as THREE from 'three';

export const LAYOUTS = ['table', 'sphere', 'helix', 'grid'];
export const FLAT_LAYOUTS = new Set(['table', 'grid']);

const SPACING_X = 140;
const SPACING_Y = 180;
const F_BLOCK_LIFT = 120; // pull the lanthanide/actinide rows up, closing most of the empty row 8

/** Bounding box used to frame each layout on screen, plus how far its front sits from the centre. */
export const LAYOUT_BOUNDS = {
  table: { width: 2580, height: 1700, front: 0 },
  sphere: { width: 1900, height: 1900, front: 800 },
  helix: { width: 2000, height: 1200, front: 900 },
  grid: { width: 1800, height: 1800, front: 2000 },
};

/**
 * Returns { table: [...], sphere: [...], ... } where each entry is
 * { position: Vector3, quaternion: Quaternion, normal: Vector3 } in element order.
 */
export function computeLayouts(elements) {
  const n = elements.length;
  const dummy = new THREE.Object3D();
  const lookTarget = new THREE.Vector3();
  const result = { table: [], sphere: [], helix: [], grid: [] };

  const save = (list) => {
    list.push({
      position: dummy.position.clone(),
      quaternion: dummy.quaternion.clone(),
      normal: new THREE.Vector3(0, 0, 1).applyQuaternion(dummy.quaternion),
    });
  };

  elements.forEach((el, i) => {
    // Table: standard periodic table grid from xpos/ypos.
    const lift = el.ypos >= 9 ? F_BLOCK_LIFT : 0;
    dummy.position.set((el.xpos - 9.5) * SPACING_X, -(el.ypos - 5.5) * SPACING_Y + lift - 60, 0);
    dummy.quaternion.identity();
    save(result.table);

    // Sphere: evenly spread points (spiral), tiles facing outward.
    const phi = Math.acos(-1 + (2 * i) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;
    dummy.position.setFromSphericalCoords(800, phi, theta);
    lookTarget.copy(dummy.position).multiplyScalar(2);
    dummy.lookAt(lookTarget);
    save(result.sphere);

    // Helix: one long spiral, tiles facing outward.
    const angle = i * 0.175 + Math.PI;
    const y = -(i * 8) + 470;
    dummy.position.setFromCylindricalCoords(900, angle, y);
    lookTarget.set(dummy.position.x * 2, dummy.position.y, dummy.position.z * 2);
    dummy.lookAt(lookTarget);
    save(result.helix);

    // Grid: 5 x 5 slabs stacked in depth.
    dummy.position.set((i % 5) * 400 - 800, -(Math.floor(i / 5) % 5) * 400 + 800, Math.floor(i / 25) * 1000 - 2000);
    dummy.quaternion.identity();
    save(result.grid);
  });

  return result;
}
