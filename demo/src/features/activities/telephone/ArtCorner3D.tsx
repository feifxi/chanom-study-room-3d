'use client';

import { ART, EASELS, GALLERY } from '../spots';

/**
 * The art corner's furniture (feature 11): a paint-splatter rug, three easels facing it, a paint
 * cart and a gallery easel with a picture on it. Static on purpose: drawing telephone happens in the
 * panel, like Gartic Phone, so nothing here changes during a game (and it all merges into the
 * library's static batch).
 */
export function ArtCorner() {
  return (
    <group>
      <mesh position={[ART.x, 0.012, ART.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ART.r * 0.92, 40]} />
        <meshStandardMaterial color="#f4e6d4" roughness={1} />
      </mesh>
      {SPLATS.map(([dx, dz, r, c], i) => (
        <mesh key={i} position={[ART.x + dx, 0.014, ART.z + dz]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r, 16]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
      {EASELS.map((e, i) => (
        <group key={i} position={[e.x, 0, e.z]} rotation={[0, e.yaw, 0]}>
          <Easel height={1.55} canvas={[0.62, 0.46]} paint={CANVAS_PAINT[i]!} />
        </group>
      ))}
      <group position={[GALLERY.x, 0, GALLERY.z]} rotation={[0, GALLERY.yaw, 0]}>
        <Easel height={GALLERY.y + GALLERY.height / 2 + 0.1} canvas={[GALLERY.width, GALLERY.height]} paint={GALLERY_PAINT} framed />
      </group>
      <PaintCart x={ART.x + 0.25} z={ART.z - 1.9} />
    </group>
  );
}

const WOOD = '#b98a5e';
const INK = '#2b2140';
type Splat = [dx: number, dz: number, r: number, color: string];
const SPLATS: Splat[] = [
  [-0.6, 0.3, 0.16, '#ff8fb1'],
  [0.5, -0.45, 0.12, '#7cc4ff'],
  [0.2, 0.75, 0.1, '#ffd166'],
  [-0.25, -0.7, 0.09, '#8be0b0'],
  [0.78, 0.25, 0.08, '#b79cff'],
];

/** A few colour blocks on each canvas: a picture from far away, cheap up close. */
type Blob = [u: number, v: number, w: number, h: number, color: string];
const CANVAS_PAINT: Blob[][] = [
  [
    [0, 0.08, 0.5, 0.42, '#ffd166'],
    [-0.12, -0.18, 0.3, 0.14, '#12a37f'],
  ],
  [
    [-0.15, 0.05, 0.36, 0.5, '#7cc4ff'],
    [0.2, -0.1, 0.24, 0.3, '#ff8fb1'],
  ],
  [[0.05, 0, 0.6, 0.12, '#b79cff']],
];
const GALLERY_PAINT: Blob[] = [
  [0, 0.22, 1, 0.56, '#bfe3ff'],
  [0, -0.28, 1, 0.44, '#9fd8a8'],
  [0.28, 0.28, 0.14, 0.24, '#ffd166'],
  [-0.22, -0.12, 0.3, 0.3, '#ff8fb1'],
  [-0.22, 0.08, 0.36, 0.1, '#e35d6a'],
];

function Easel({ height, canvas: [cw, ch], paint, framed }: { height: number; canvas: [number, number]; paint: Blob[]; framed?: boolean }) {
  const top = height - 0.05;
  const mid = top - ch / 2 - 0.02;
  return (
    <group>
      {/* Two front legs leaning in, one back leg */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * cw * 0.32, height / 2, 0.06]} rotation={[0.06, 0, s * -0.08]} castShadow>
          <boxGeometry args={[0.04, height, 0.04]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
      <mesh position={[0, height / 2 - 0.05, -0.22]} rotation={[-0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.035, height, 0.035]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {/* Ledge the canvas rests on */}
      <mesh position={[0, mid - ch / 2 - 0.02, 0.1]}>
        <boxGeometry args={[cw * 0.9, 0.035, 0.08]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {framed && (
        <mesh position={[0, mid, 0.085]}>
          <boxGeometry args={[cw + 0.1, ch + 0.1, 0.03]} />
          <meshStandardMaterial color="#d9a441" roughness={0.5} metalness={0.3} />
        </mesh>
      )}
      <mesh position={[0, mid, 0.105]} castShadow>
        <boxGeometry args={[cw, ch, 0.025]} />
        <meshStandardMaterial color="#fbfaf6" roughness={0.9} />
      </mesh>
      {paint.map(([u, v, w, h, c], i) => (
        <mesh key={i} position={[u * cw, mid + v * ch, 0.119 + i * 0.001]}>
          <planeGeometry args={[w * cw, h * ch]} />
          <meshStandardMaterial color={c} roughness={0.9} />
        </mesh>
      ))}
      {!framed && (
        <mesh position={[0, mid, 0.12]}>
          <planeGeometry args={[cw * 0.5, 0.012]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      )}
    </group>
  );
}

/** A little cart with paint pots and brushes in a jar. */
function PaintCart({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.36, 0]} castShadow>
        <boxGeometry args={[0.56, 0.06, 0.38]} />
        <meshStandardMaterial color="#ef8a3c" />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.52, 0.04, 0.34]} />
        <meshStandardMaterial color="#ef8a3c" />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.24, 0.2, sz * 0.15]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
            <meshStandardMaterial color="#c9ced6" metalness={0.4} />
          </mesh>
        )),
      )}
      {['#ff5f8f', '#3d8bfd', '#ffd166', '#12a37f'].map((c, i) => (
        <mesh key={c} position={[-0.18 + (i % 2) * 0.12, 0.43, -0.07 + Math.floor(i / 2) * 0.12]}>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 10]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <mesh position={[0.15, 0.45, 0]}>
        <cylinderGeometry args={[0.05, 0.045, 0.12, 10]} />
        <meshStandardMaterial color="#bfe3ff" transparent={false} />
      </mesh>
      {[-0.02, 0.02].map((dx, i) => (
        <mesh key={i} position={[0.15 + dx, 0.55, 0]} rotation={[0, 0, dx * 6]}>
          <cylinderGeometry args={[0.008, 0.008, 0.2, 5]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
    </group>
  );
}
