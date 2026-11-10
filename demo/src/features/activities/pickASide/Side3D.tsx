'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { areaRadius, type Area } from '../../map/types';
import { LETTERS, ZONE_COLORS, sidesFor, type SideGame } from './game';

/**
 * Pick a Side in the room (what everyone sees, from anywhere): the open floor's rug split into 2 or 4
 * coloured zones, each with its letter and answer written on the floor. At the reveal the right zone
 * stays lit and the others fade; would-you-rather keeps both lit.
 *
 * Zones follow the screen (turned 45° to face the camera), the same as `zoneAt`, so "A on the left"
 * in the HUD is on the left in the room; the rug's edge is the zone's edge, whatever shape it is.
 */
export function SideZones({ game, area }: { game: SideGame; area: Area }) {
  const sides = sidesFor(game.mode);
  const q = game.questions[game.i];
  const revealing = game.stage === 'reveal';
  const shapes = useMemo(() => zoneShapes(area, sides), [area, sides]);
  const k = areaRadius(area) * 0.55;
  const zones = Array.from({ length: sides }, (_, i) => {
    // Label spots in the turned plane: x = screen right, y = screen up
    const cx = sides === 2 ? (i === 0 ? -1 : 1) * k : (i % 2 === 0 ? -0.75 : 0.75) * k;
    const cy = sides === 2 ? 0 : (i < 2 ? 0.75 : -0.75) * k;
    const dim = revealing && game.mode !== 'wyr' && q?.right !== i;
    return { i, cx, cy, dim };
  });
  return (
    <group position={[area.x, 0.026, area.z]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {zones.map((z) => (
          <mesh key={z.i} userData={{ dynamic: true }}>
            <shapeGeometry args={[shapes[z.i]!]} />
            <meshBasicMaterial
              color={z.dim ? '#b9b2bd' : ZONE_COLORS[z.i]}
              transparent
              opacity={z.dim ? 0.25 : revealing ? 0.75 : 0.5}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <group rotation={[0, Math.PI / 4, 0]}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {q &&
            zones.map((z) => (
              <FloorLabel
                key={`${game.i}-${z.i}`}
                x={z.cx}
                y={z.cy}
                letter={LETTERS[z.i]!}
                text={q.answers[z.i] ?? ''}
                color={ZONE_COLORS[z.i]!}
                right={revealing && game.mode !== 'wyr' && q.right === z.i}
                dim={z.dim}
                small={sides === 4}
              />
            ))}
        </group>
      </group>
    </group>
  );
}

type Pt = [number, number];
const GAP = 0.05;

/** The rug's outline (inset a little), cut into screen-aligned halves or quarters. The open floor's four-colour rug uses the same cut. */
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
  // Screen axes from room offsets (dx, dz): u = right, v = up
  const u = ([dx, dz]: Pt) => (dx - dz) / Math.SQRT2;
  const v = ([dx, dz]: Pt) => -(dx + dz) / Math.SQRT2;
  const halfPlanes = (i: number): ((p: Pt) => number)[] => {
    const left = (p: Pt) => -u(p) - GAP;
    const right = (p: Pt) => u(p) - GAP;
    if (sides === 2) return [i === 0 ? left : right];
    const top = (p: Pt) => v(p) - GAP;
    const bottom = (p: Pt) => -v(p) - GAP;
    return [i % 2 === 0 ? left : right, i < 2 ? top : bottom];
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

/** The letter and answer, painted on the floor (a canvas texture: no font files to load). */
function FloorLabel({
  x,
  y,
  letter,
  text,
  color,
  right,
  dim,
  small,
}: {
  x: number;
  y: number;
  letter: string;
  text: string;
  color: string;
  right: boolean;
  dim: boolean;
  small: boolean;
}) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath();
    g.roundRect(8, 8, 496, 240, 48);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(78, 128, 54, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = '900 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(right ? '✓' : letter, 78, 132);
    g.fillStyle = '#45323d';
    g.textAlign = 'left';
    const lines = wrap(g, text, 340, 72);
    const lh = parseInt(g.font.split(' ')[1]!) * 1.1;
    lines.forEach((l, i) => g.fillText(l, 152, 132 + (i - (lines.length - 1) / 2) * lh));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [letter, text, color, right]);
  useEffect(() => () => texture.dispose(), [texture]);
  const w = small ? 1.3 : 1.7;
  return (
    <mesh position={[x, y, 0.01]} userData={{ dynamic: true }}>
      <planeGeometry args={[w, w / 2]} />
      <meshBasicMaterial map={texture} transparent opacity={dim ? 0.45 : 1} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Up to two lines at the biggest size that fits. */
function wrap(g: CanvasRenderingContext2D, text: string, width: number, size: number): string[] {
  for (let s = size; s >= 30; s -= 4) {
    g.font = `800 ${s}px system-ui, sans-serif`;
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (g.measureText(next).width <= width) line = next;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2 && lines.every((l) => g.measureText(l).width <= width)) return lines;
  }
  g.font = '800 30px system-ui, sans-serif';
  return [text.length > 20 ? `${text.slice(0, 19)}…` : text];
}
