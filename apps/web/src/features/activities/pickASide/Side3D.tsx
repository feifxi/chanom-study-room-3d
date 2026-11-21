'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Area } from '../../map/types';
import { LETTERS, ZONE_COLORS, sidesFor, zoneOffset, type SideGame } from './game';

/**
 * Pick a Side in the room (what everyone sees, from anywhere): the open floor's rug cut into 2 or 4
 * coloured zones along its edges, each with its letter on the floor (the answers are in the panel). At the reveal
 * the right zone stays lit and the others fade; would-you-rather keeps both lit.
 *
 * The cut is the same as `zoneAt`. The zones are opaque, so the open floor's four-colour rug never
 * shows through (Would you rather is two colours, not four); the labels lie flat but turn with the
 * camera, so they read straight however someone has turned the view.
 */
export function SideZones({ game, area }: { game: SideGame; area: Area }) {
  const sides = sidesFor(game.mode);
  const q = game.questions[game.i];
  const revealing = game.stage === 'reveal';
  const shapes = useMemo(() => zoneShapes(area, sides), [area, sides]);
  const labels = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ camera }) => {
    camera.getWorldDirection(look);
    const yaw = Math.atan2(-look.x, -look.z);
    for (const g of labels.current) if (g) g.rotation.y = yaw;
  });
  const zones = Array.from({ length: sides }, (_, i) => {
    const dim = revealing && game.mode !== 'wyr' && q?.right !== i;
    return { i, ...zoneOffset(area, sides, i), dim };
  });
  return (
    <group position={[area.x, 0.026, area.z]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {zones.map((z) => (
          <mesh key={z.i} userData={{ dynamic: true }}>
            <shapeGeometry args={[shapes[z.i]!]} />
            <meshBasicMaterial color={zoneColor(z.i, z.dim, revealing)} />
          </mesh>
        ))}
      </group>
      {q &&
        zones.map((z) => (
          <group
            key={`${game.i}-${z.i}`}
            ref={(g) => {
              labels.current[z.i] = g;
            }}
            position={[z.dx, 0, z.dz]}
            rotation={[0, Math.PI / 4, 0]}
          >
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <FloorLabel
                letter={LETTERS[z.i]!}
                color={ZONE_COLORS[z.i]!}
                right={revealing && game.mode !== 'wyr' && q.right === z.i}
                dim={z.dim}
                small={sides === 4}
              />
            </group>
          </group>
        ))}
    </group>
  );
}

const look = new THREE.Vector3();
const RUG = new THREE.Color('#e8dcc8');
const DIM = new THREE.Color('#b9b2bd');
/** The zone's colour woven into the rug's cream: soft while asking, stronger at the reveal, grey when wrong. */
function zoneColor(i: number, dim: boolean, revealing: boolean) {
  if (dim) return RUG.clone().lerp(DIM, 0.6);
  return RUG.clone().lerp(new THREE.Color(ZONE_COLORS[i]), revealing ? 0.85 : 0.6);
}

type Pt = [number, number];
const GAP = 0.05;

/** The rug's outline (inset a little), cut along its edges into halves or quarters. The open floor's four-colour rug uses the same cut. */
export function zoneShapes(area: Area, sides: number): THREE.Shape[] {
  const outline: Pt[] =
    area.kind === 'circle'
      ? Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          return [Math.cos(a) * (area.r - 0.1), Math.sin(a) * (area.r - 0.1)];
        })
      : [
          [-area.w / 2 + 0.1, -area.d / 2 + 0.1],
          [area.w / 2 - 0.1, -area.d / 2 + 0.1],
          [area.w / 2 - 0.1, area.d / 2 - 0.1],
          [-area.w / 2 + 0.1, area.d / 2 - 0.1],
        ];
  // Zone i keeps x < 0 or x > 0 (its column) and, with four, z < 0 or z > 0 (its row); see zoneAt
  const halfPlanes = (i: number): ((p: Pt) => number)[] => {
    const col = i % 2 === 0 ? ([dx]: Pt) => -dx - GAP : ([dx]: Pt) => dx - GAP;
    if (sides === 2) return [col];
    return [col, i < 2 ? ([, dz]: Pt) => -dz - GAP : ([, dz]: Pt) => dz - GAP];
  };
  return Array.from({ length: sides }, (_, i) => {
    const poly = halfPlanes(i).reduce(clip, outline);
    const shape = new THREE.Shape();
    // The flat group maps shape (x, y) to room (dx, −dz)
    poly.forEach(([dx, dz], k) => (k === 0 ? shape.moveTo(dx, -dz) : shape.lineTo(dx, -dz)));
    shape.closePath();
    return shape;
  });
}

/** Sutherland–Hodgman: keep the part of the polygon where f ≥ 0. */
function clip(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * Just the zone's letter, painted on the floor (✓ on the right one at the reveal). The answers
 * themselves are read in the panel: long text on the floor was hard to read from the room camera.
 * A canvas texture: no font files to load.
 */
function FloorLabel({ letter, color, right, dim, small }: { letter: string; color: string; right: boolean; dim: boolean; small: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.arc(128, 128, 122, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(128, 128, 104, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = '900 130px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(right ? '✓' : letter, 128, 138);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [letter, color, right]);
  useEffect(() => () => texture.dispose(), [texture]);
  const w = small ? 0.9 : 1.1;
  return (
    <mesh position={[0, 0, 0.01]} userData={{ dynamic: true }}>
      <planeGeometry args={[w, w]} />
      <meshBasicMaterial map={texture} transparent opacity={dim ? 0.45 : 1} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
