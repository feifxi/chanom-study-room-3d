'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { perfMeter } from './perf';
import { SlowFrameDetector, markActive, recentlyActive } from './quality';

/**
 * Drives the render loop at a cap instead of the screen's refresh rate (a 120 Hz screen would
 * otherwise render twice as often for no visible gain). Use with <Canvas frameloop="never">.
 *
 * Two caps: `fps` while you're doing something (walking, or input in the last moment: the camera,
 * a click, a key) and `idleFps` while you're still. Reports when frames are consistently too slow,
 * judged only while active (idle frames are slow on purpose).
 */
export function FrameDriver({
  fps,
  idleFps,
  motion,
  onSlow,
}: {
  fps: number;
  idleFps: number;
  /** Your movement: walking counts as active (click-to-walk keeps going with no input). */
  motion: { readonly current: { moving: boolean } | null };
  onSlow?: () => void;
}) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const onInput = (e: Event) => {
      // Hovering doesn't change the scene; a drag, a touch, the wheel or a key does
      if (e.type === 'pointermove' && !(e as PointerEvent).buttons) return;
      markActive();
    };
    const kinds = ['pointerdown', 'pointermove', 'wheel', 'keydown'] as const;
    kinds.forEach((k) => window.addEventListener(k, onInput, { passive: true, capture: true }));
    const detector = onSlow ? new SlowFrameDetector(1000 / fps) : null;
    let raf = 0;
    let last = 0;
    let reported = false;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const active = !!motion.current?.moving || recentlyActive(t);
      const cap = active ? fps : idleFps;
      const interval = 1000 / cap;
      // Small tolerance so a 60 Hz screen doesn't skip every other frame at a 60 fps cap
      if (last && t - last < interval - 2) return;
      if (last && active && detector && !reported && detector.add(t - last)) {
        reported = true;
        onSlow?.();
      }
      last = t;
      perfMeter.cap = cap;
      const start = performance.now();
      advance(t / 1000); // R3F wants seconds; rAF gives milliseconds (ms made everything run 1000x fast)
      perfMeter.frame(t, performance.now() - start);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      kinds.forEach((k) => window.removeEventListener(k, onInput, { capture: true }));
    };
  }, [advance, fps, idleFps, motion, onSlow]);
  return null;
}
