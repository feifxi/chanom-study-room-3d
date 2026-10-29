'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';

/** Frames to keep refreshing after a change, so late-mounting props (the Buddy Machine) are included. */
const REFRESH_FRAMES = 10;

type Box<T> = { current: T };

/** Redraw the shadow map only while it's stale. Plain function: it mutates the renderer every frame. */
function refresh(gl: THREE.WebGLRenderer, state: Box<{ key: string; left: number }>, key: string) {
  gl.shadowMap.autoUpdate = false;
  if (state.current.key !== key) state.current = { key, left: REFRESH_FRAMES };
  if (state.current.left > 0) {
    gl.shadowMap.needsUpdate = true;
    state.current.left--;
  }
}

/**
 * The furniture never moves, so the shadow map is drawn when the light changes (day/night, quality)
 * instead of every frame. Characters use BlobShadow instead of casting real shadows.
 */
export function StaticShadows({ lightKey }: { lightKey: string }) {
  const gl = useThree((s) => s.gl);
  const state = useRef({ key: '', left: 0 });
  useFrame(() => refresh(gl, state, lightKey));
  return null;
}
