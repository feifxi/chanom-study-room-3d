'use client';

import { useEffect, useRef, useState } from 'react';
import { FOCUS_PRESETS, type FocusPreset } from '@connecta/shared';
import { LiveRoom } from '../room3d/liveRoom';
import type { MockRoom } from '../room3d/mockRoom';
import { usePomodoro, type Phase } from '../room/usePomodoro';
import { playChime } from './chime';

export type FocusTimer = ReturnType<typeof usePomodoro>;

/**
 * Your focus timer: the game server's in a real room (it times the rounds that reach the rankings),
 * the browser's own in the demo's mock rooms (Common rooms until feature 14). Same shape either way.
 * `onPhase` hears each change with the minutes of a focus round that just ended.
 */
export function useFocusTimer(room: MockRoom, subject: () => string, onPhase: (phase: Phase, focusedMin: number) => void): FocusTimer {
  const live = room instanceof LiveRoom ? room : null;
  const local = usePomodoro(onPhase);
  const server = useServerTimer(live, subject, onPhase);
  return server ?? local;
}

function useServerTimer(
  live: LiveRoom | null,
  subject: () => string,
  onPhase: (phase: Phase, focusedMin: number) => void,
): FocusTimer | null {
  const me = live?.state.players.get('me');
  // Away hides a break on your label; the countdown still says whether one runs
  const phase: Phase =
    me?.status === 'focus' ? 'focus' : me?.status === 'break' || (me?.status === 'away' && me.statusEndsAt) ? 'break' : 'idle';
  const endsAt = me?.statusEndsAt ?? 0;
  const preset = FOCUS_PRESETS[(me?.focusPreset ?? 0) as FocusPreset];
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!live || phase === 'idle') return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [live, phase]);

  // The server moves the phases on; chime when a round or break runs out (not when you press Stop)
  const was = useRef<{ phase: Phase; since: number }>({ phase, since: me?.focusSince ?? 0 });
  const stopped = useRef(false);
  const onPhaseRef = useRef(onPhase);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);
  useEffect(() => {
    const before = was.current;
    was.current = { phase, since: me?.focusSince ?? 0 };
    if (!live || before.phase === phase) return;
    if (!stopped.current && phase !== 'focus') playChime(phase === 'break' ? 'break' : 'idle');
    stopped.current = false;
    onPhaseRef.current(phase, before.phase === 'focus' && before.since ? Math.floor((Date.now() - before.since) / 60_000) : 0);
  }, [live, phase, me?.focusSince]);

  if (!live) return null;
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
