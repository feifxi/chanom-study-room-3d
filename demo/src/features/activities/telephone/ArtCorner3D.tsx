'use client';

import type { Area, WallPanel } from '../../map/types';

export interface ArtPlaces {
  area: Area;
  easels: { x: number; z: number; yaw: number }[];
  cart: { x: number; z: number };
  /** The folding screen (its `y` is the centre of the framed pictures); a map may hang its pictures on a wall instead. */
  gallery?: WallPanel;
}

/**
 * The art corner's furniture (feature 11): paint splats on the rug, four easels with a stool each, a
 * paint cart and a folding screen along the back whose framed canvases show what people drew. Static
 * on purpose: Draw & Guess happens in the panel, like Gartic Phone, so nothing here changes during a
 * game (and it all merges into the library's static batch). The rug itself is drawn with the others.
 */
export function ArtCorner({ area: ART_AREA, easels: EASELS, cart: PAINT_CART, gallery }: ArtPlaces) {
  return (
    <group>
      {SPLATS.map(([dx, dz, r, c], i) => (
        <mesh key={i} position={[ART_AREA.x + dx, 0.016, ART_AREA.z + dz]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <circleGeometry args={[r, 16]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
      {EASELS.map((e, i) => (
        <group key={i} position={[e.x, 0, e.z]} rotation={[0, e.yaw, 0]}>
          <Easel height={1.55} canvas={[0.62, 0.46]} paint={CANVAS_PAINT[i]!} />
          {/* A stool behind each easel */}
          <group position={[0, 0, -0.75]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.05, 14]} />
              <meshStandardMaterial color={WOOD} />
            </mesh>
            {[-1, 1].flatMap((sx) =>
              [-1, 1].map((sz) => (
                <mesh key={`${sx}${sz}`} position={[sx * 0.11, 0.2, sz * 0.11]} rotation={[sz * 0.12, 0, -sx * 0.12]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
                  <meshStandardMaterial color={WOOD_DARK} />
                </mesh>
              )),
            )}
          </group>
        </group>
      ))}
      {gallery && <GalleryScreen gallery={gallery} />}
      <PaintCart x={PAINT_CART.x} z={PAINT_CART.z} />
    </group>
  );
}

const WOOD = '#b98a5e';
const WOOD_DARK = '#6b4a33';
const INK = '#2b2140';
type Splat = [dx: number, dz: number, r: number, color: string];
const SPLATS: Splat[] = [
  [-1.1, 0.4, 0.18, '#e9a9c2'],
  [0.7, -0.6, 0.13, '#a9cde3'],
  [0.3, 1.1, 0.11, '#e8d49a'],
  [-0.4, -1.1, 0.1, '#b7d6b0'],
  [1.3, 0.5, 0.09, '#c9b6d9'],
  [-1.5, -0.5, 0.08, '#e8d49a'],
];

/** A few colour blocks on each canvas: a picture from far away, cheap up close. */
type Blob = [u: number, v: number, w: number, h: number, color: string];
const CANVAS_PAINT: Blob[][] = [
  [
    [0, 0.08, 0.5, 0.42, '#e8d49a'],
    [-0.12, -0.18, 0.3, 0.14, '#b7d6b0'],
  ],
  [
    [-0.15, 0.05, 0.36, 0.5, '#a9cde3'],
    [0.2, -0.1, 0.24, 0.3, '#e9a9c2'],
  ],
  [[0.05, 0, 0.6, 0.12, '#c9b6d9']],
  [
    [0.1, 0.15, 0.3, 0.3, '#e9a9c2'],
    [-0.2, -0.15, 0.4, 0.2, '#b7d6b0'],
  ],
];
/** The three framed pictures on the folding screen. */
const SCREEN_PAINT: Blob[][] = [
  [
    [0, 0.22, 1, 0.56, '#a9cde3'],
    [0, -0.28, 1, 0.44, '#b7d6b0'],
    [0.28, 0.28, 0.14, 0.24, '#e8d49a'],
  ],
  [
    [-0.22, -0.12, 0.3, 0.3, '#e9a9c2'],
    [0.2, 0.1, 0.4, 0.3, '#a9cde3'],
  ],
  [
    [0, 0, 0.8, 0.1, '#e0457b'],
    [0, 0.3, 0.3, 0.3, '#e8d49a'],
  ],
];

/** A three-panel oak screen, zig-zagged so it stands, each panel wearing a framed canvas. */
function GalleryScreen({ gallery: GALLERY }: { gallery: WallPanel }) {
  const panelW = GALLERY.width / 3;
  const canvasW = panelW - 0.24;
  const canvasH = 0.62;
  return (
    <group position={[GALLERY.x, 0, GALLERY.z]}>
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[i * panelW, 0, i === 0 ? -0.12 : 0.08]} rotation={[0, i * 0.22, 0]}>
          <mesh position={[0, GALLERY.height / 2, 0]} castShadow>
            <boxGeometry args={[panelW - 0.04, GALLERY.height, 0.05]} />
            <meshStandardMaterial color={WOOD} roughness={0.85} />
          </mesh>
          <mesh position={[0, GALLERY.y, 0.04]}>
            <boxGeometry args={[canvasW + 0.08, canvasH + 0.08, 0.025]} />
            <meshStandardMaterial color="#c9a24a" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, GALLERY.y, 0.055]}>
            <boxGeometry args={[canvasW, canvasH, 0.02]} />
            <meshStandardMaterial color="#f1e4d6" roughness={0.9} />
          </mesh>
          {SCREEN_PAINT[i + 1]!.map(([u, v, w, h, c], k) => (
            <mesh key={k} position={[u * canvasW, GALLERY.y + v * canvasH, 0.067 + k * 0.001]} castShadow receiveShadow>
              <planeGeometry args={[w * canvasW, h * canvasH]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Easel({ height, canvas: [cw, ch], paint }: { height: number; canvas: [number, number]; paint: Blob[] }) {
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
      <mesh position={[0, mid, 0.105]} castShadow>
        <boxGeometry args={[cw, ch, 0.025]} />
        <meshStandardMaterial color="#f1e4d6" roughness={0.9} />
      </mesh>
      {paint.map(([u, v, w, h, c], i) => (
        <mesh key={i} position={[u * cw, mid + v * ch, 0.119 + i * 0.001]} castShadow receiveShadow>
          <planeGeometry args={[w * cw, h * ch]} />
          <meshStandardMaterial color={c} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, mid, 0.12]} castShadow receiveShadow>
        <planeGeometry args={[cw * 0.5, 0.012]} />
        <meshStandardMaterial color={INK} />
      </mesh>
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
            <meshStandardMaterial color="#3a3036" />
          </mesh>
        )),
      )}
      {['#ff5f8f', '#3d8bfd', '#e8d49a', '#b7d6b0'].map((c, i) => (
        <mesh key={c} position={[-0.18 + (i % 2) * 0.12, 0.43, -0.07 + Math.floor(i / 2) * 0.12]}>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 10]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <mesh position={[0.16, 0.47, 0.06]}>
        <cylinderGeometry args={[0.05, 0.04, 0.16, 10]} />
        <meshStandardMaterial color="#f1e4d6" />
      </mesh>
    </group>
  );
}
