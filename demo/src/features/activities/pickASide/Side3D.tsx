'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { LETTERS, ZONE_COLORS, sidesFor, type SideGame } from './game';

/**
 * Pick a Side in the room (what everyone sees, from anywhere): the ring split into 2 or 4 coloured
 * zones, each with its letter and answer written on the floor. At the reveal the right zone stays lit
 * and the others fade; would-you-rather keeps both lit.
 *
 * Built in screen-aligned axes (turned 45° to face the camera), the same as `zoneAt`, so "A on the
 * left" in the HUD is on the left in the room.
 */
export function SideZones({ game, area }: { game: SideGame; area: { x: number; z: number; r: number } }) {
  const sides = sidesFor(game.mode);
  const q = game.questions[game.i];
  const revealing = game.stage === 'reveal';
  const zones = Array.from({ length: sides }, (_, i) => {
    // Sector angles in the turned plane: x = screen right, y = screen up
    const [start, length] = sides === 2 ? [i === 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI] : QUAD[i]!;
    const k = area.r * 0.55;
    const cx = sides === 2 ? (i === 0 ? -1 : 1) * k : (i % 2 === 0 ? -0.75 : 0.75) * k;
    const cy = sides === 2 ? 0 : (i < 2 ? 0.75 : -0.75) * k;
    const dim = revealing && game.mode !== 'wyr' && q?.right !== i;
    return { i, start, length, cx, cy, dim };
  });
  return (
    <group position={[area.x, 0.026, area.z]} rotation={[0, Math.PI / 4, 0]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {zones.map((z) => (
          <mesh key={z.i} userData={{ dynamic: true }}>
            <circleGeometry args={[area.r - 0.1, 40, z.start + 0.04, z.length - 0.08]} />
            <meshBasicMaterial
              color={z.dim ? '#b9b2bd' : ZONE_COLORS[z.i]}
              transparent
              opacity={z.dim ? 0.25 : revealing ? 0.75 : 0.5}
              depthWrite={false}
            />
          </mesh>
        ))}
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
  );
}

const QUAD: [number, number][] = [
  [Math.PI / 2, Math.PI / 2], // A: top left
  [0, Math.PI / 2], // B: top right
  [Math.PI, Math.PI / 2], // C: bottom left
  [(3 * Math.PI) / 2, Math.PI / 2], // D: bottom right
];

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
  const w = small ? 1.2 : 1.55;
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
