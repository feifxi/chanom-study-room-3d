'use client';

import { useEffect, useRef, useState } from 'react';
import type { TimerPhase } from '@study/shared';
import type { StudyRoom } from '../room/useStudyRoom';
import { playChime } from './chime';

const MINUTE = 60_000;

export interface PersonalTimer {
  phase: TimerPhase;
  /** Server-time ms when the phase ends. */
  endsAt: number;
  focusMin: number;
  breakMin: number;
  cycle: number;
}

/**
 * Your pomodoro. The client runs the focus/break cycle and reports each phase
 * to the room, which shows it (and how long you've focused) above your head.
 */
export function usePersonalTimer(room: StudyRoom | null, clockOffset: number) {
  const [timer, setTimer] = useState<PersonalTimer>({ phase: 'idle', endsAt: 0, focusMin: 25, breakMin: 5, cycle: 0 });
  const ref = useRef(timer);
  ref.current = timer;
  const serverNow = () => Date.now() + clockOffset;

  const report = (t: PersonalTimer) => room?.send('timer:personal', { phase: t.phase, endsAt: t.endsAt });

  const start = (focusMin: number, breakMin: number) => {
    const next: PersonalTimer = { phase: 'focus', endsAt: serverNow() + focusMin * MINUTE, focusMin, breakMin, cycle: 0 };
    report(next);
    setTimer(next);
    playChime('focus');
  };

  const stop = () => {
    const next: PersonalTimer = { ...ref.current, phase: 'idle', endsAt: 0 };
    report(next);
    setTimer(next);
  };

  // Advance focus → break → focus when a phase runs out
  useEffect(() => {
    const id = setInterval(() => {
      const t = ref.current;
      if (t.phase === 'idle' || Date.now() + clockOffset < t.endsAt) return;
      const toBreak = t.phase === 'focus';
      const next: PersonalTimer = {
        ...t,
        phase: toBreak ? 'break' : 'focus',
        endsAt: Date.now() + clockOffset + (toBreak ? t.breakMin : t.focusMin) * MINUTE,
        cycle: toBreak ? t.cycle : t.cycle + 1,
      };
      report(next);
      setTimer(next);
      playChime(next.phase);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, clockOffset]);

  return { timer, start, stop };
}

/** Mark yourself away after the tab has been hidden for a while, and back when you return. */
export function useAutoAway(room: StudyRoom | null, delayMs = 60_000) {
  useEffect(() => {
    if (!room) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let auto = false;
    const onVisibility = () => {
      clearTimeout(timeout);
      if (document.hidden) {
        timeout = setTimeout(() => {
          auto = true;
          room.send('away', { on: true });
        }, delayMs);
      } else if (auto) {
        auto = false;
        room.send('away', { on: false });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [room, delayMs]);
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
