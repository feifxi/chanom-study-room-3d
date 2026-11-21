'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merges the static meshes inside it into one mesh per shading and shadow flags, with each mesh's
 * colour stored per vertex, so a whole map costs a handful of draw calls instead of hundreds. (One
 * batch per colour cost ~85 draw calls on a cosy map, more than the rest of the room together.) The original meshes stay in the scene
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
    const key = [m.flatShading, m.side, o.castShadow, o.receiveShadow].join('|');
    // Non-indexed and position/normal-only, so geometries of different shapes can be merged together
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(
      new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld),
    );
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    // The material's colour (already linear, like vertex colours) on every vertex
    const n = g.attributes.position!.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([m.color.r, m.color.g, m.color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
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
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: src.flatShading, side: src.side });
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = sample.castShadow;
    mesh.receiveShadow = sample.receiveShadow;
    mesh.name = 'static-batch';
    batches.push(mesh);
  }
  for (const m of hidden) m.visible = false;
  return { batches, hidden };
}
