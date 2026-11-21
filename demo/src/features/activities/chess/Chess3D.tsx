'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Chess, type PieceSymbol } from 'chess.js';
import { activeMap } from '../../map/active';
import { engine, type ChessGame } from './game';

/** The board on the chess table: its size and how high its squares sit (see ChessTable in Activity3D). */
export const BOARD = 0.56;
export const BOARD_TOP = 0.782;
const SQ = BOARD / 8;
const WHITE = new THREE.Color('#f6efe2');
const BLACK = new THREE.Color('#3b2a24');
const TYPES: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];

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

const START = new Chess();

/**
 * The pieces on the chess table, live: the real game while one is on (so people walking past see
 * how it's going), the starting position otherwise. White's side faces whichever stool White sits
 * on. One instanced mesh per piece type, coloured per piece: six draw calls for all 32.
 */
export function ChessPieces({ game, whiteSide }: { game: ChessGame | null; whiteSide: 1 | -1 }) {
  const t = activeMap().chessTable;
  const geometries = useMemo(
    () => Object.fromEntries(TYPES.map((p) => [p, pieceGeometry(p)])) as Record<PieceSymbol, THREE.BufferGeometry>,
    [],
  );
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.5 }), []);
  const meshes = useRef<Partial<Record<PieceSymbol, THREE.InstancedMesh>>>({});
  const fen = game?.fen ?? START.fen();

  useLayoutEffect(() => {
    const board = game ? engine(game).board() : START.board();
    const counts = Object.fromEntries(TYPES.map((p) => [p, 0])) as Record<PieceSymbol, number>;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    // board()[0] is rank 8; files run a → h
    board.forEach((row, ri) =>
      row.forEach((p, fi) => {
        if (!p) return;
        const mesh = meshes.current[p.type];
        if (!mesh) return;
        const rank = 8 - ri;
        // Rank 1 nearest White's stool; from there, the a-file is on White's left
        const x = whiteSide * (BOARD / 2 - SQ * (rank - 0.5));
        const z = whiteSide * (BOARD / 2 - SQ * (fi + 0.5));
        // Knights face the other side
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (p.color === 'w' ? 1 : -1) * whiteSide * (Math.PI / 2) + Math.PI / 2);
        m.compose(new THREE.Vector3(x, 0, z), q, one);
        const i = counts[p.type]++;
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, p.color === 'w' ? WHITE : BLACK);
      }),
    );
    for (const p of TYPES) {
      const mesh = meshes.current[p];
      if (!mesh) continue;
      mesh.count = counts[p];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // fen: the position; game: which engine to read it from
  }, [fen, game, whiteSide]);

  if (!t) return null;
  return (
    <group position={[t.x, BOARD_TOP, t.z]}>
      {TYPES.map((p) => (
        <instancedMesh
          key={p}
          ref={(m) => {
            if (m) meshes.current[p] = m;
          }}
          args={[geometries[p], material, 16]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
