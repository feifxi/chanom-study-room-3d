'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { BOARD } from '../spots';
import { drawBoard, type BoardStore } from './board';

/** The whiteboard's frame and marker tray on the left wall (static, inside the room's StaticBatch). */
export function WhiteboardFrame() {
  return (
    <group position={[BOARD.x, BOARD.y, BOARD.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.06, BOARD.height + 0.1, BOARD.width + 0.1]} />
        <meshStandardMaterial color="#c9ced6" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0.08, -BOARD.height / 2 - 0.06, 0]} castShadow>
        <boxGeometry args={[0.12, 0.03, BOARD.width * 0.9]} />
        <meshStandardMaterial color="#b4bac4" />
      </mesh>
      {/* Markers in the tray */}
      {['#2b2140', '#ff5f8f', '#3d8bfd'].map((c, i) => (
        <mesh key={c} position={[0.09, -BOARD.height / 2 - 0.035, -0.5 + i * 0.16]} rotation={[0, 0, Math.PI / 2]}>
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
    <mesh position={[BOARD.x + 0.035, BOARD.y, BOARD.z]} rotation={[0, Math.PI / 2, 0]} userData={{ dynamic: true }}>
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
