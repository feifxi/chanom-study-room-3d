'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merges the static meshes inside it into one mesh per look (colour, shading, shadow flags), so
 * the room costs a few dozen draw calls instead of hundreds. The original meshes stay in the scene
 * but hidden, so the JSX that builds the room is unchanged.
 *
 * Skipped (they change at runtime, or someone looks them up): named meshes, instanced meshes,
 * anything transparent or emissive, non-standard materials, and meshes with userData.dynamic.
 */
export function StaticBatch({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);

  // Children mount before this effect runs, so the whole room is there to merge
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    const { batches, hidden } = buildBatches(group);
    for (const b of batches) group.add(b);
    return () => {
      for (const b of batches) {
        group.remove(b);
        b.geometry.dispose();
        (b.material as THREE.Material).dispose();
      }
      for (const m of hidden) m.visible = true;
    };
  }, []);

  return <group ref={root}>{children}</group>;
}

function isBatchable(o: THREE.Object3D): o is THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || o.name || o.userData.dynamic) return false;
  const m = o.material;
  return (
    m instanceof THREE.MeshStandardMaterial &&
    !m.transparent &&
    !m.map &&
    m.emissive.getHex() === 0 &&
    o.geometry.attributes.position !== undefined
  );
}

function buildBatches(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<
    string,
    { sample: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; geometries: THREE.BufferGeometry[] }
  >();
  const hidden: THREE.Mesh[] = [];

  group.traverse((o) => {
    if (!isBatchable(o) || !o.visible) return;
    const m = o.material;
    const key = [m.color.getHexString(), m.flatShading, m.side, o.castShadow, o.receiveShadow].join('|');
    // Non-indexed and normal/uv-only, so geometries of different shapes can be merged together
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(
      new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld),
    );
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    const bucket = buckets.get(key) ?? { sample: o, geometries: [] };
    bucket.geometries.push(g);
    buckets.set(key, bucket);
    hidden.push(o);
  });

  const batches: THREE.Mesh[] = [];
  for (const { sample, geometries } of buckets.values()) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!merged) continue;
    const src = sample.material;
    // Lambert shading is cheaper than PBR and looks the same on these matte, single-colour props
    const material = new THREE.MeshLambertMaterial({ color: src.color, flatShading: src.flatShading, side: src.side });
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = sample.castShadow;
    mesh.receiveShadow = sample.receiveShadow;
    mesh.name = 'static-batch';
    batches.push(mesh);
  }
  for (const m of hidden) m.visible = false;
  return { batches, hidden };
}
