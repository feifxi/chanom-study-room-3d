'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { activeMap } from '../../map/active';
import { drawBoard, type BoardStore } from './board';

/** The whiteboard's frame and marker tray on the left wall (static, inside the room's StaticBatch). */
export function WhiteboardFrame() {
  const BOARD = activeMap().board;
  return (
    <group position={[BOARD.x, BOARD.y, BOARD.z]} rotation={[0, BOARD.yaw, 0]}>
      {/* An oak frame, like the shelves, so the board belongs in the room (local +z faces the room) */}
      <mesh castShadow>
        <boxGeometry args={[BOARD.width + 0.16, BOARD.height + 0.16, 0.06]} />
        <meshStandardMaterial color="#8a6244" roughness={0.8} />
      </mesh>
      <mesh position={[0, -BOARD.height / 2 - 0.06, 0.08]} castShadow>
        <boxGeometry args={[BOARD.width * 0.9, 0.03, 0.14]} />
        <meshStandardMaterial color="#9d7352" />
      </mesh>
      {/* Markers in the tray */}
      {['#2b2140', '#ff5f8f', '#3d8bfd'].map((c, i) => (
        <mesh key={c} position={[-0.5 + i * 0.16, -BOARD.height / 2 - 0.035, 0.09]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.12, 8]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The drawing on the wall, live for everyone in the room: redrawn into a canvas texture when the
 * strokes change (at most 10 times a second, which reads as live from across the room).
 */
export function BoardSurface({ board }: { board: BoardStore }) {
  const BOARD = activeMap().board;
  const surface = useMemo(() => new Surface(), []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const draw = () => {
      timer = null;
      surface.draw(board);
    };
    draw();
    const off = board.subscribe(() => {
      timer ??= setTimeout(draw, 100);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [board, surface]);
  useEffect(() => () => surface.texture.dispose(), [surface]);
  const texture = surface.texture;
  return (
    <mesh
      position={[BOARD.x + Math.sin(BOARD.yaw) * 0.035, BOARD.y, BOARD.z + Math.cos(BOARD.yaw) * 0.035]}
      rotation={[0, BOARD.yaw, 0]}
      userData={{ dynamic: true }}
    >
      <planeGeometry args={[BOARD.width, BOARD.height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** A canvas and the texture showing it. */
class Surface {
  readonly canvas = Object.assign(document.createElement('canvas'), { width: 1024, height: 576 });
  readonly texture = new THREE.CanvasTexture(this.canvas);
  constructor() {
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }
  draw(board: BoardStore) {
    drawBoard(this.canvas.getContext('2d')!, board.strokes, this.canvas.width, this.canvas.height);
    this.texture.needsUpdate = true;
  }
}
