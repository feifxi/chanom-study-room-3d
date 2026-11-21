'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PieceSymbol } from 'chess.js';

/** The board on the chess table: its size and how high its squares sit (see ChessTable in Activity3D). */
export const BOARD = 0.56;
export const BOARD_TOP = 0.782;
const SQ = BOARD / 8;
const WHITE = new THREE.Color('#f6efe2');
const BLACK = new THREE.Color('#3b2a24');

/** Simple but recognisable shapes, a bit bigger than life so they read from the room camera. */
function pieceGeometry(t: PieceSymbol) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, y: number, rotZ = 0, x = 0) => {
    if (rotZ) g.rotateZ(rotZ);
    g.translate(x, y, 0);
    parts.push(g.toNonIndexed());
  };
  // Every piece stands on a round base
  add(new THREE.CylinderGeometry(0.022, 0.026, 0.012, 12), 0.006);
  if (t === 'p') {
    add(new THREE.CylinderGeometry(0.01, 0.019, 0.034, 10), 0.029);
    add(new THREE.SphereGeometry(0.014, 10, 8), 0.05);
  } else if (t === 'r') {
    add(new THREE.CylinderGeometry(0.017, 0.02, 0.05, 10), 0.037);
    add(new THREE.CylinderGeometry(0.022, 0.02, 0.016, 10), 0.068);
  } else if (t === 'n') {
    add(new THREE.CylinderGeometry(0.014, 0.02, 0.036, 10), 0.03);
    // The head: a block leaning forward with a muzzle
    add(new THREE.BoxGeometry(0.02, 0.04, 0.018), 0.062, -0.35);
    add(new THREE.BoxGeometry(0.026, 0.014, 0.016), 0.072, 0, 0.012);
  } else if (t === 'b') {
    add(new THREE.CylinderGeometry(0.01, 0.019, 0.04, 10), 0.032);
    add(new THREE.ConeGeometry(0.016, 0.042, 10), 0.072);
    add(new THREE.SphereGeometry(0.006, 6, 4), 0.096);
  } else if (t === 'q') {
    add(new THREE.CylinderGeometry(0.012, 0.021, 0.064, 10), 0.044);
    add(new THREE.CylinderGeometry(0.021, 0.012, 0.02, 10), 0.086);
    add(new THREE.SphereGeometry(0.009, 8, 6), 0.102);
  } else {
    add(new THREE.CylinderGeometry(0.013, 0.022, 0.072, 10), 0.048);
    add(new THREE.CylinderGeometry(0.02, 0.013, 0.016, 10), 0.092);
    add(new THREE.BoxGeometry(0.007, 0.03, 0.007), 0.115);
    add(new THREE.BoxGeometry(0.02, 0.007, 0.007), 0.116);
  }
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return g;
}

const BACK_RANK: PieceSymbol[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

/** One colour's 16 pieces in the starting position, merged into a single geometry. */
function startingSide(white: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  for (let file = 0; file < 8; file++) {
    for (const [rank, type] of [
      [white ? 1 : 8, BACK_RANK[file]!],
      [white ? 2 : 7, 'p'],
    ] as const) {
      const g = pieceGeometry(type);
      // Knights face the other side
      g.rotateY((white ? 1 : -1) * (Math.PI / 2) + Math.PI / 2);
      // Rank 1 on the +x side; from there, the a-file is on White's left
      g.translate(BOARD / 2 - SQ * (rank - 0.5), 0, BOARD / 2 - SQ * (file + 0.5));
      parts.push(g);
    }
  }
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return g;
}

/**
 * The pieces on the chess table, always in the starting position: the game itself is played in the
 * panel (and watched from the rug), so the 3D set is decor. Plain meshes, so the room's static
 * batch merges them with the table.
 */
export function ChessSet() {
  const sides = useMemo(() => [startingSide(true), startingSide(false)] as const, []);
  return (
    <group position={[0, BOARD_TOP, 0]}>
      <mesh geometry={sides[0]} castShadow>
        <meshStandardMaterial color={WHITE} roughness={0.5} />
      </mesh>
      <mesh geometry={sides[1]} castShadow>
        <meshStandardMaterial color={BLACK} roughness={0.5} />
      </mesh>
    </group>
  );
}
