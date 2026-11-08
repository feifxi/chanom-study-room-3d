'use client';

import { useEffect, useRef, useState } from 'react';
import { playChime } from '../focus/chime';

export type Phase = 'idle' | 'focus' | 'break';

interface Timer {
  phase: Phase;
  preset: [number, number];
  endsAt: number;
  /** When the current focus round started, to count minutes if it's stopped early. */
  startedAt: number;
  now: number;
}

/**
 * A personal Pomodoro: focus → chime → break → chime → idle. Only you control it, and each round
 * needs a press to start (no auto-repeat), which also keeps rankings honest.
 * `onPhase` gets the minutes focused when a focus round ends or is stopped.
 */
export function usePomodoro(onPhase: (phase: Phase, focusedMin: number) => void) {
  const [t, setT] = useState<Timer>({ phase: 'idle', preset: [25, 5], endsAt: 0, startedAt: 0, now: 0 });
  const onPhaseRef = useRef(onPhase);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);

  // Tick while running; phase changes happen here, in the timer callback, not during render
  useEffect(() => {
    if (t.phase === 'idle') return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now < t.endsAt) return setT((s) => ({ ...s, now }));
      playChime(t.phase === 'focus' ? 'break' : 'idle');
      const next: Phase = t.phase === 'focus' ? 'break' : 'idle';
      setT((s) => ({ ...s, phase: next, now, endsAt: next === 'break' ? now + s.preset[1] * 60_000 : 0 }));
      onPhaseRef.current(next, t.phase === 'focus' ? Math.floor((now - t.startedAt) / 60_000) : 0);
    }, 500);
    return () => clearInterval(id);
  }, [t.phase, t.endsAt, t.startedAt]);

  const start = (preset: [number, number]) => {
    const now = Date.now();
    setT({ phase: 'focus', preset, endsAt: now + preset[0] * 60_000, startedAt: now, now });
    onPhase('focus', 0);
  };
  const stop = () => {
    const now = Date.now();
    setT((s) => ({ ...s, phase: 'idle' }));
    onPhase('idle', t.phase === 'focus' ? Math.floor((now - t.startedAt) / 60_000) : 0);
  };

  const left = Math.max(0, t.endsAt - t.now);
  const total = (t.phase === 'break' ? t.preset[1] : t.preset[0]) * 60_000;
  return { phase: t.phase, preset: t.preset, left, progress: t.phase === 'idle' ? 0 : 1 - left / total, start, stop };
}

export const formatLeft = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
