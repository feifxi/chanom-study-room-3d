/** Pomodoro timers and the status shown above each head. */

export const TIMER_PHASES = ['idle', 'focus', 'break'] as const;
export type TimerPhase = (typeof TIMER_PHASES)[number];

/** Which timer drives a player's status: none, the shared room timer, or their own. */
export const TIMER_MODES = ['none', 'room', 'personal'] as const;
export type TimerMode = (typeof TIMER_MODES)[number];

export const POMODORO_PRESETS = [
  { focus: 25, break: 5 },
  { focus: 50, break: 10 },
] as const;

/** Upper bound for any timer segment, in minutes. */
export const MAX_TIMER_MIN = 120;
/** Lower bound (kept tiny so tests can run whole cycles quickly). */
export const MIN_TIMER_MIN = 0.05;

/** Focus shorter than this is not counted towards stats. */
export const MIN_COUNTED_FOCUS_MIN = 1;

export interface RoomTimerView {
  phase: TimerPhase;
  /** Server epoch ms when the current phase ends (0 when idle). */
  endsAt: number;
  focusMin: number;
  breakMin: number;
  /** Completed focus rounds since the timer was started. */
  cycle: number;
}
