/**
 * The focus timer (docs/features/07-study-tools.md): personal, two presets, timed by
 * the game server, saved by the API.
 */

/** Focus, then a break, in minutes. Each round needs a press to start. */
export const FOCUS_PRESETS = [
  { focus: 25, break: 5 },
  { focus: 50, break: 10 },
] as const;
export type FocusPreset = 0 | 1;

/** A round stopped sooner than this doesn't count */
export const MIN_COUNTED_FOCUS_MIN = 1;
/** The most a day counts towards rankings, so a timer left running all day doesn't win */
export const DAILY_RANK_CAP_MIN = 12 * 60;

/** The to-do list (one per account, private): at most this many items, each this long */
export const TODO_LIMIT = 50;
export const TODO_MAX = 120;
/** Done items clear themselves after this many days */
export const TODO_DONE_DAYS = 7;

/** Game → API, on a BullMQ queue: a focus round that ended or was stopped (1+ minute, members only). */
export const FOCUS_QUEUE = 'focus-rounds';
export interface FocusRound {
  /** Made by the game server, so a retried job never saves a round twice */
  id: string;
  userId: string;
  roomId: string;
  subject: string;
  /** Epoch ms */
  startedAt: number;
  endedAt: number;
  minutes: number;
}

/** "Focusing · Calculus" for friends (presence), when they let friends see what they're doing */
export const focusActivity = (subject: string) => (subject ? `Focusing · ${subject}` : 'Focusing');

/** Whether a time zone name is one this runtime knows (Intl), e.g. Asia/Bangkok */
export function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar day (yyyy-mm-dd) of an instant in a time zone */
export function dayIn(tz: string, at: number | Date): string {
  // en-CA formats dates as yyyy-mm-dd
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** When the day containing `at` began in a time zone, as an instant */
export function startOfDayIn(tz: string, at: number | Date): Date {
  return midnightIn(tz, dayIn(tz, at));
}

/** When the week containing `at` began (Monday) in a time zone, as an instant */
export function startOfWeekIn(tz: string, at: number | Date): Date {
  const day = dayIn(tz, at);
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  return midnightIn(tz, addDays(day, -weekday));
}

/** A calendar day (yyyy-mm-dd) moved by whole days */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Midnight at the start of a calendar day (yyyy-mm-dd) in a time zone, as an instant */
export function midnightIn(tz: string, day: string): Date {
  // The zone's offset at that midnight: guess UTC midnight, then correct by the offset seen there (twice, for DST edges)
  let guess = Date.parse(`${day}T00:00:00Z`);
  for (let i = 0; i < 2; i++) guess = Date.parse(`${day}T00:00:00Z`) - offsetMs(tz, guess);
  return new Date(guess);
}

/** How far a time zone is ahead of UTC at an instant */
function offsetMs(tz: string, at: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!, +parts.second!);
  return asUtc - Math.floor(at / 1000) * 1000;
}
