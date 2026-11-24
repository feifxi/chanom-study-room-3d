import { randomUUID } from 'node:crypto';
import { FOCUS_PRESETS, type FocusPreset } from '@connecta/shared';

/** How long a timer minute lasts; tests shorten it so whole rounds run in a second */
export const timing = { minuteMs: 60_000 };

/**
 * One person's focus timer (docs/features/07-study-tools.md): focus → break → idle, each round started by a press. The
 * game server keeps it, so the minutes that reach the rankings are timed here, not by the browser.
 */
export interface FocusTimer {
  phase: 'idle' | 'focus' | 'break';
  preset: FocusPreset;
  /** When the focus round began (epoch ms; 0 when idle) */
  startedAt: number;
  /** When the current focus or break ends */
  endsAt: number;
  /** The round's id, so a retried save never counts it twice */
  roundId: string;
}

/** A focus round that ended (ran out or was stopped) */
export interface EndedRound {
  id: string;
  /** Ran to its end (a daily quest counts finished sessions); Stop or leaving ends it early */
  complete: boolean;
  startedAt: number;
  endedAt: number;
  minutes: number;
}

export const idleTimer = (preset: FocusPreset = 0): FocusTimer => ({ phase: 'idle', preset, startedAt: 0, endsAt: 0, roundId: '' });

export function startFocus(preset: FocusPreset, now: number): FocusTimer {
  return { phase: 'focus', preset, startedAt: now, endsAt: now + FOCUS_PRESETS[preset].focus * timing.minuteMs, roundId: randomUUID() };
}

/** Whole minutes focused; a round never counts past its own length */
export function focusedMinutes(t: FocusTimer, now: number) {
  return Math.floor((Math.min(now, t.endsAt) - t.startedAt) / timing.minuteMs);
}

/** Time passing: focus runs out into a break, a break into idle. */
export function tickTimer(t: FocusTimer, now: number): { timer: FocusTimer; ended?: EndedRound } {
  if (t.phase === 'idle' || now < t.endsAt) return { timer: t };
  if (t.phase === 'break') return { timer: idleTimer(t.preset) };
  const ended = { id: t.roundId, complete: true, startedAt: t.startedAt, endedAt: t.endsAt, minutes: focusedMinutes(t, now) };
  return { timer: { ...t, phase: 'break', endsAt: t.endsAt + FOCUS_PRESETS[t.preset].break * timing.minuteMs }, ended };
}

/** Stop pressed, or you left: a focus round counts what you did so far. */
export function stopTimer(t: FocusTimer, now: number): { timer: FocusTimer; ended?: EndedRound } {
  const timer = idleTimer(t.preset);
  if (t.phase !== 'focus') return { timer };
  return {
    timer,
    ended: {
      id: t.roundId,
      complete: now >= t.endsAt,
      startedAt: t.startedAt,
      endedAt: Math.min(now, t.endsAt),
      minutes: focusedMinutes(t, now),
    },
  };
}
