import { useSyncExternalStore } from 'react';
import type * as THREE from 'three';

/**
 * The room's performance budget per frame: the map's share plus each person's. Maps are checked
 * against the map share (the editor's budget check); the overlay turns a number red when it's over.
 * - Draw calls cost phones' CPUs more than triangles cost their GPUs; batching keeps them low.
 * - A person is about 5 draw calls (4 merged meshes + a blob shadow) and ~19k triangles, or ~7k in
 *   battery saver, plus one small bone texture.
 * - JS time is ours per frame (scene updates + render submission): 8 ms leaves the rest of a 60 fps
 *   frame to the browser and the GPU.
 * - The map share was 120 draw calls for V1's 20 × 14 m room; the redesigned 26 × 18 m library
 *   (2026-11-10) measures about 122 after batching, so it is 130 now. Still under a fifth of the
 *   total with 100 people in the room.
 */
export const PERF_BUDGET = {
  map: { drawCalls: 130, triangles: 150_000, textures: 32 },
  person: { drawCalls: 6, triangles: 20_000, textures: 1 },
  programs: 40,
  cpuMs: 8,
} as const;

export function budgetFor(people: number) {
  const { map, person } = PERF_BUDGET;
  return {
    drawCalls: map.drawCalls + person.drawCalls * people,
    triangles: map.triangles + person.triangles * people,
    textures: map.textures + person.textures * people,
  };
}

export interface PerfSample {
  fps: number;
  /** Average JavaScript time per frame (ms). */
  cpuMs: number;
  /** The longest gap between two frames in the last second (ms): stutters show here. */
  worstMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  avatars: number;
  labels: number;
}

/** Collects frame timings (from FrameDriver) and renderer counts (after each render); publishes twice a second. */
class PerfMeter {
  private frames = 0;
  private cpu = 0;
  private worst = 0;
  private windowStart = 0;
  private lastFrame = 0;
  private counts = { drawCalls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0, avatars: 0, labels: 0 };
  sample: PerfSample | null = null;
  private listeners = new Set<() => void>();

  frame(t: number, cpuMs: number) {
    if (this.lastFrame) this.worst = Math.max(this.worst, t - this.lastFrame);
    this.lastFrame = t;
    this.frames++;
    this.cpu += cpuMs;
    if (!this.windowStart) this.windowStart = t;
    const span = t - this.windowStart;
    if (span < 500 || !this.listeners.size) return;
    this.sample = {
      fps: Math.round((this.frames * 1000) / span),
      cpuMs: this.cpu / this.frames,
      worstMs: this.worst,
      ...this.counts,
    };
    Object.assign(this, { frames: 0, cpu: 0, worst: 0, windowStart: t });
    this.listeners.forEach((l) => l());
  }

  /** Right after the frame's render: what the GPU was asked to draw. */
  rendered(gl: THREE.WebGLRenderer, avatars: number, labels: number) {
    const { render, memory, programs } = gl.info;
    // The steady frame: the lowest in the window, so a one-off shadow-map redraw doesn't count
    const fresh = this.frames <= 1;
    Object.assign(this.counts, {
      drawCalls: fresh ? render.calls : Math.min(this.counts.drawCalls, render.calls),
      triangles: fresh ? render.triangles : Math.min(this.counts.triangles, render.triangles),
      geometries: memory.geometries,
      textures: memory.textures,
      programs: programs?.length ?? 0,
      avatars,
      labels,
    });
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  get = () => this.sample;
}

export const perfMeter = new PerfMeter();

export function usePerfSample() {
  return useSyncExternalStore(perfMeter.subscribe, perfMeter.get, () => null);
}

// --- Demo toggle: Demo tab → Performance overlay, or ?perf in the address ---

const KEY = 'connecta-demo:perf';
const toggles = new Set<() => void>();

function readOn() {
  try {
    return localStorage.getItem(KEY) === '1' || new URLSearchParams(location.search).has('perf');
  } catch {
    return false;
  }
}

export function setPerfOverlay(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // This page only
  }
  toggles.forEach((l) => l());
}

export function usePerfOverlay() {
  return useSyncExternalStore(
    (l) => {
      toggles.add(l);
      return () => toggles.delete(l);
    },
    readOn,
    () => false,
  );
}
