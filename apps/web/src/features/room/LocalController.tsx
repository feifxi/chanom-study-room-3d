'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { LocalMotion } from './Avatar';
import { LocalPlayerDriver, type Hint, type OrbitTarget } from './LocalPlayerDriver';
import type { StudyRoom } from './roomSession';

export type { Hint } from './LocalPlayerDriver';

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

interface Props {
  room: StudyRoom;
  motion: React.RefObject<LocalMotion>;
  /** Called when the nearest interaction in reach changes (null = none). */
  onHint: (hint: Hint | null) => void;
  /** Open the Buddy Machine panel. */
  onOpenMachine: () => void;
}

/** Wires the keyboard and the render loop to the local player's driver. */
export function LocalController({ room, motion, onHint, onOpenMachine }: Props) {
  const driver = useMemo(() => new LocalPlayerDriver(room, motion), [room, motion]);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitTarget | null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      if (driver.press(e.code) === 'openMachine') onOpenMachine();
    };
    const up = (e: KeyboardEvent) => driver.release(e.code);
    const blur = () => driver.releaseAll();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [driver, onOpenMachine]);

  useFrame((_state, dt) => {
    const hint = driver.frame(dt, camera, controls);
    if (hint !== undefined) onHint(hint);
  });

  return null;
}
