'use client';

import type { CharacterDetail } from '../avatar/character';

/**
 * Rendering quality: smooth to start (battery saver on touch screens), dropping to battery saver by
 * itself if the device can't keep up; the viewer can switch it too (RoomView).
 */
/** steady: battery saver on a device that still can't keep up, so the frame rate is capped too. */
export type QualityTier = 'smooth' | 'saver' | 'steady';

export interface Quality {
  /** Cap on device pixels per CSS pixel: 2x retina renders 4x the pixels for little visible gain here */
  dpr: number;
  /** While you're doing something: walking, moving or zooming the camera, pressing things. */
  fps: number;
  /** While you're still (sitting, watching, reading): nobody sees 30 vs 60 when little moves, and it halves the work. */
  idleFps: number;
  shadows: boolean;
  /** Battery saver builds characters with fewer segments (about a third of the triangles). */
  characters: CharacterDetail;
}

export const QUALITY: Record<QualityTier, Quality> = {
  smooth: { dpr: 1.5, fps: 60, idleFps: 60, shadows: true, characters: 'full' },
  // Battery saver gives up looks before smoothness: what you do stays at 60
  saver: { dpr: 1, fps: 60, idleFps: 30, shadows: false, characters: 'low' },
  // Only if that's still too slow: a steady 30 beats a stuttering 45
  steady: { dpr: 1, fps: 30, idleFps: 30, shadows: false, characters: 'low' },
};

/** Slow-device detector: true once frames have been much slower than the target for a few seconds. */
export class SlowFrameDetector {
  private samples: number[] = [];
  constructor(
    private readonly targetMs: number,
    private readonly windowSize = 120,
  ) {}

  /** Feed the time between two rendered frames. */
  add(ms: number) {
    if (ms > 1000) return false; // tab was hidden or the machine slept
    this.samples.push(ms);
    if (this.samples.length > this.windowSize) this.samples.shift();
    if (this.samples.length < this.windowSize) return false;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    // Averaging under ~38 fps when aiming for 60 means the device is struggling
    return avg > this.targetMs * 1.6;
  }
}

/** How long after your last input the frame rate stays up (covers the camera easing to a stop). */
const ACTIVE_MS = 1500;
let lastInput = -Infinity;
/** You did something (pointer, wheel, key): render at the full rate for a moment. */
export const markActive = () => {
  lastInput = performance.now();
};
export const recentlyActive = (now: number) => now - lastInput < ACTIVE_MS;
