'use client';

import { useEffect, useState } from 'react';

/**
 * Rendering quality. "auto" starts smooth and drops to battery saver by itself if the device can't
 * keep up; "saver" is the viewer's choice. Remembered in this browser (the room page is client-only).
 */
export type QualityMode = 'auto' | 'saver';
export type QualityTier = 'smooth' | 'saver';

export interface Quality {
  /** Cap on device pixels per CSS pixel: 2x retina renders 4x the pixels for little visible gain here */
  dpr: number;
  fps: number;
  shadows: boolean;
}

export const QUALITY: Record<QualityTier, Quality> = {
  smooth: { dpr: 1.5, fps: 60, shadows: true },
  saver: { dpr: 1, fps: 30, shadows: false },
};

const KEY = 'chanom-study:quality';

function load(): QualityMode {
  try {
    return localStorage.getItem(KEY) === 'saver' ? 'saver' : 'auto';
  } catch {
    return 'auto';
  }
}

export function useQualityMode() {
  const [mode, setMode] = useState<QualityMode>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // Blocked storage: the choice just isn't remembered
    }
  }, [mode]);
  return [mode, setMode] as const;
}

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
