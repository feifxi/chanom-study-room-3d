'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Minus, Plus } from 'lucide-react';
import type * as THREE from 'three';
import { cn } from '@/lib/utils';

/**
 * Camera zoom that reads as 100% (the whole library in view). Rooms start at 175% (closer, about
 * V1's playtested framing), so the percentage still tells you how far in you are. Min/max match
 * the OrbitControls limits (55%–340%).
 */
export const ZOOM = { base: 62, start: 62 * 1.75, min: 34, max: 210, step: 1.2 } as const;

type Box<T> = { current: T };

/** Apply a pending zoom request to the camera; returns the new percentage if it changed. Runs every frame. */
function syncZoom(camera: THREE.Camera, request: Box<number | null>, last: Box<number>): number | null {
  const ortho = camera as THREE.OrthographicCamera;
  if (request.current !== null) {
    ortho.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, request.current));
    ortho.updateProjectionMatrix();
    request.current = null;
  }
  // Scroll-wheel zoom happens in OrbitControls, so report any change, not just ours
  const percent = Math.round((ortho.zoom / ZOOM.base) * 100);
  if (percent === last.current) return null;
  last.current = percent;
  return percent;
}

/** Bridges the 3D camera to the DOM zoom control. Mount inside <Canvas>. */
export function ZoomBridge({ request, onZoom }: { request: Box<number | null>; onZoom: (percent: number) => void }) {
  const camera = useThree((s) => s.camera);
  const last = useRef(0);
  useFrame(() => {
    const percent = syncZoom(camera, request, last);
    if (percent !== null) onZoom(percent);
  });
  return null;
}

/** Bottom-right "− 100% +" control (V1). Touch screens pinch instead, and the joystick has that corner. */
export function ZoomControl({ percent, onZoom, className }: { percent: number; onZoom: (zoom: number) => void; className?: string }) {
  const current = (percent / 100) * ZOOM.base;
  return (
    <div className={cn('panel flex items-center gap-1 p-1.5', className)}>
      <button
        onClick={() => onZoom(current / ZOOM.step)}
        aria-label="Zoom out"
        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-12 text-center text-sm font-bold tabular-nums">{percent}%</span>
      <button
        onClick={() => onZoom(current * ZOOM.step)}
        aria-label="Zoom in"
        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
