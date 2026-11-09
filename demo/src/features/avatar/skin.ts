import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Turns a character built from ~80 small meshes into one skinned mesh per kind of material (about 4
 * draw calls instead of ~40), without changing how it looks or animates.
 *
 * - The parts the animation moves (head, legs, hands, eyes, swaying hair…) become the bones: the rig
 *   keeps moving the same objects, and the GPU moves the vertices with them.
 * - Every other mesh is baked onto its nearest moving ancestor, with its material's colour stored per
 *   vertex, so same-kind materials of any colour share one draw call.
 * - Hidden parts (happy eyes, open mouth) are hidden by scaling their bone to zero: see `show`.
 *
 * Materials are shared by every character, so 100 people compile the same 4 shaders once.
 */

let shared: Record<Bucket, THREE.Material> | null = null;
type Bucket = 'toon' | 'basic' | 'clear' | 'outline';

function materials(gradientMap: THREE.Texture, outline: THREE.Material) {
  shared ??= {
    toon: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap }),
    basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
    clear: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }),
    outline,
  };
  return shared;
}

export function skinCharacter(root: THREE.Object3D, moving: THREE.Object3D[], gradientMap: THREE.Texture, outline: THREE.Material) {
  root.updateMatrixWorld(true);
  const bones = [root, ...moving];
  const boneIndex = new Map(bones.map((b, i) => [b, i]));
  const parts: Record<Bucket, THREE.BufferGeometry[]> = { toon: [], basic: [], clear: [], outline: [] };
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });

  for (const m of meshes) {
    let bone: THREE.Object3D | null = m;
    while (bone && !boneIndex.has(bone)) bone = bone.parent;
    const index = boneIndex.get(bone ?? root)!;
    const mat = m.material as THREE.Material & { color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number; opacity: number };
    const bucket: Bucket =
      mat === outline ? 'outline' : mat.transparent ? 'clear' : mat instanceof THREE.MeshToonMaterial ? 'toon' : 'basic';

    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.applyMatrix4(m.matrixWorld);
    const n = g.attributes.position!.count;

    // The material's colour, per vertex (a glowing clip keeps its glow as a brighter colour)
    const c = (mat.color ?? new THREE.Color('#ffffff')).clone();
    if (mat.emissive && mat.emissiveIntensity) c.add(mat.emissive.clone().multiplyScalar(mat.emissiveIntensity));
    const size = bucket === 'clear' ? 4 : 3;
    const colors = new Float32Array(n * size);
    for (let i = 0; i < n; i++) {
      colors.set(size === 4 ? [c.r, c.g, c.b, mat.opacity] : [c.r, c.g, c.b], i * size);
    }
    if (bucket !== 'outline') g.setAttribute('color', new THREE.BufferAttribute(colors, size));
    g.setAttribute(
      'skinIndex',
      new THREE.BufferAttribute(
        new Uint16Array(n * 4).fill(0).map((_, i) => (i % 4 === 0 ? index : 0)),
        4,
      ),
    );
    g.setAttribute(
      'skinWeight',
      new THREE.BufferAttribute(
        new Float32Array(n * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)),
        4,
      ),
    );
    parts[bucket].push(g);
  }

  // The original meshes stop drawing: moving ones stay as bones, the rest go
  for (const m of meshes) {
    if (boneIndex.has(m)) m.visible = false;
    else m.removeFromParent();
    m.geometry.dispose();
    if (m.material !== outline) (m.material as THREE.Material).dispose();
  }

  const skeleton = new THREE.Skeleton(bones as THREE.Bone[]);
  const mats = materials(gradientMap, outline);
  const skinned: THREE.SkinnedMesh[] = [];
  for (const bucket of ['toon', 'basic', 'clear', 'outline'] as Bucket[]) {
    if (!parts[bucket].length) continue;
    const geo = mergeGeometries(parts[bucket])!;
    parts[bucket].forEach((g) => g.dispose());
    const mesh = new THREE.SkinnedMesh(geo, mats[bucket]);
    // Rest-pose bounds plus room for sitting and swinging, so off-screen people are skipped cheaply
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.6);
    root.add(mesh);
    mesh.bind(skeleton, new THREE.Matrix4());
    skinned.push(mesh);
  }
  for (const b of moving) b.userData.baseScale = b.scale.clone();
  return skinned;
}

/** Show or hide a moving part of a skinned character (bones can't be invisible, so they shrink to nothing). */
export function show(part: THREE.Object3D, on: boolean, scaleY = 1) {
  const base = part.userData.baseScale as THREE.Vector3 | undefined;
  if (!base) {
    part.visible = on;
    return;
  }
  if (on) part.scale.set(base.x, base.y * scaleY, base.z);
  else part.scale.setScalar(0);
}
