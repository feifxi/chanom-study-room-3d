'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Minus, Plus } from 'lucide-react';
import type * as THREE from 'three';
import { cn } from '@/lib/utils';

/**
 * 100% is the framing rooms open at (about V1's playtested one), so the label reads as "default"
 * rather than a distance. Zooming out to ~57% shows the whole library. Min/max match the
 * OrbitControls limits (31%–194%).
 */
/** The 26 × 18 m library needs a wider start than V1's room did: 100% shows about a third of it. */
export const ZOOM = { base: 62 * 1.3, start: 62 * 1.3, min: 30, max: 210, step: 1.2 } as const;

/** At least this much floor fits across the screen when a room opens. */
const MIN_VIEW_METRES = 9;

/**
 * The zoom a room opens at. Ortho zoom is pixels per metre, so a portrait phone at the desktop zoom
 * would see under 5 m of a 26 m map; narrow screens start wider instead (about 54% on a 390 px phone).
 * The room renders client-side only, so the window is there.
 */
export function startZoom(): number {
  if (typeof window === 'undefined') return ZOOM.start;
  return Math.max(ZOOM.min, Math.min(ZOOM.start, window.innerWidth / MIN_VIEW_METRES));
}

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
