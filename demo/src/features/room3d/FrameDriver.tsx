'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { SlowFrameDetector } from './quality';

/**
 * Drives the render loop at a fixed cap instead of the screen's refresh rate (a 120 Hz screen would
 * otherwise render twice as often for no visible gain). Use with <Canvas frameloop="never">.
 * Reports when frames are consistently too slow, so "auto" quality can switch to battery saver.
 */
export function FrameDriver({ fps, onSlow }: { fps: number; onSlow?: () => void }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const interval = 1000 / fps;
    const detector = onSlow ? new SlowFrameDetector(interval) : null;
    let raf = 0;
    let last = 0;
    let reported = false;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      // Small tolerance so a 60 Hz screen doesn't skip every other frame at a 60 fps cap
      if (last && t - last < interval - 2) return;
      if (last && detector && !reported && detector.add(t - last)) {
        reported = true;
        onSlow?.();
      }
      last = t;
      advance(t / 1000); // R3F wants seconds; rAF gives milliseconds (ms made everything run 1000x fast)
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [advance, fps, onSlow]);
  return null;
}
