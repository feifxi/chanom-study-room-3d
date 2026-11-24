'use client';

import { useEffect, useRef, useState } from 'react';
import { FOCUS_PRESETS, type FocusPreset } from '@connecta/shared';
import type { LiveRoom } from '../room3d/liveRoom';
import { serverNow } from '@/lib/serverClock';
import { playChime } from './chime';

export type Phase = 'idle' | 'focus' | 'break';

export interface FocusTimer {
  phase: Phase;
  /** Focus and break minutes of the round */
  preset: [number, number];
  /** Milliseconds left in the phase */
  left: number;
  progress: number;
  start(preset: [number, number]): void;
  stop(): void;
}

export const formatLeft = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Your focus timer: the game server runs it (it times the rounds that reach the rankings), so a
 * reload or another device keeps the same round. Each round needs a press to start (no auto-repeat),
 * which also keeps rankings honest. Chimes when a round or break runs out (not when you press Stop).
 */
export function useFocusTimer(live: LiveRoom, subject: () => string): FocusTimer {
  const me = live.state.players.get('me');
  // Away during a break: the break still runs
  const phase: Phase =
    me?.status === 'focus' ? 'focus' : me?.status === 'break' || (me?.status === 'away' && me.statusEndsAt) ? 'break' : 'idle';
  const endsAt = me?.statusEndsAt ?? 0;
  const preset = FOCUS_PRESETS[(me?.focusPreset ?? 0) as FocusPreset];
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (phase === 'idle') return;
    const id = setInterval(() => setNow(serverNow()), 500);
    return () => clearInterval(id);
  }, [phase]);

  // The server moves the phases on; chime when a round or break runs out (not when you press Stop)
  const was = useRef(phase);
  const stopped = useRef(false);
  useEffect(() => {
    if (was.current === phase) return;
    was.current = phase;
    if (!stopped.current && phase !== 'focus') playChime(phase === 'break' ? 'break' : 'idle');
    stopped.current = false;
  }, [phase]);

  const total = (phase === 'break' ? preset.break : preset.focus) * 60_000;
  // `now` ticks twice a second; right after a phase change it can lag, so never show more than the whole phase
  const left = phase === 'idle' ? 0 : Math.min(total, Math.max(0, endsAt - now));
  return {
    phase,
    preset: [preset.focus, preset.break],
    left,
    progress: phase === 'idle' ? 0 : 1 - left / total,
    start: (p: [number, number]) => {
      const index = FOCUS_PRESETS.findIndex((x) => x.focus === p[0]);
      live.focusStart((index < 0 ? 0 : index) as FocusPreset, subject());
    },
    stop: () => {
      stopped.current = true;
      live.focusStop();
    },
  };
}
