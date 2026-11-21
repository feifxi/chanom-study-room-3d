'use client';

import { useSyncExternalStore } from 'react';
import { ME, USERS, type User } from './mock';

/**
 * Study tools' data, shaped like the API will return it:
 * - the to-do list belongs to your account and follows you into every room (only you see it)
 * - focus minutes come from finished or stopped focus rounds of 1+ minute, timed by the server
 * - rankings: this room today, friends, everyone (only people who opted in)
 * The demo keeps your own changes in sessionStorage so they survive moving between pages.
 */

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface FocusDay {
  /** yyyy-mm-dd in your own time zone. */
  date: string;
  minutes: number;
}

export interface RankRow {
  user: Pick<User, 'id' | 'name' | 'handle' | 'color' | 'presence'>;
  minutes: number;
}

export type RankScope = 'friends' | 'everyone';
export type RankPeriod = 'today' | 'week';

/** Most to-dos you can keep; done ones clear after 7 days. */
export const TODO_LIMIT = 50;
/** The most a day counts towards rankings, so a timer left running all day doesn't win. */
export const DAILY_RANK_CAP_MIN = 12 * 60;

interface State {
  todos: Todo[];
  /** Minutes you focused today in this demo session, on top of the mock base. */
  todayExtra: number;
  /** Subject → minutes added in this demo session. */
  subjectsExtra: Record<string, number>;
  /** Show me on the Everyone ranking. Default on 18+, off under 18. */
  onGlobal: boolean;
}

const INITIAL: State = {
  todos: [
    { id: 't1', text: 'Read chapter 7', done: true },
    { id: 't2', text: 'Calculus exercises 1–10', done: false },
    { id: 't3', text: 'OS flashcards', done: false },
  ],
  todayExtra: 0,
  subjectsExtra: {},
  onGlobal: true,
};

const KEY = 'connecta:focus';
const EVENT = 'connecta:focus';
let cached: { raw: string | null; state: State } | null = null;

function read(): State {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    // Blocked storage: the demo just starts fresh
  }
  if (cached && cached.raw === raw) return cached.state;
  cached = { raw, state: raw ? { ...INITIAL, ...(JSON.parse(raw) as Partial<State>) } : INITIAL };
  return cached.state;
}

function write(patch: Partial<State>) {
  const next = { ...read(), ...patch };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ignore: changes just aren't kept
  }
  cached = null;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

const useFocusState = () => useSyncExternalStore(subscribe, read, () => INITIAL);

// --- To-do ---

export function useTodos() {
  const { todos } = useFocusState();
  return {
    todos,
    left: todos.filter((t) => !t.done).length,
    full: todos.length >= TODO_LIMIT,
    add: (text: string) => {
      const t = text.trim().slice(0, 120);
      if (!t || read().todos.length >= TODO_LIMIT) return;
      write({ todos: [...read().todos, { id: `t${Date.now()}`, text: t, done: false }] });
    },
    toggle: (id: string) => write({ todos: read().todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }),
    remove: (id: string) => write({ todos: read().todos.filter((t) => t.id !== id) }),
    clearDone: () => write({ todos: read().todos.filter((t) => !t.done) }),
  };
}

// --- Focus minutes ---

/** Count focused minutes (the server does this when a round ends or is stopped after 1+ minute). */
export function logFocus(minutes: number, subject: string) {
  if (minutes < 1) return;
  const s = read();
  const key = subject.trim() || 'No subject';
  write({
    todayExtra: s.todayExtra + minutes,
    subjectsExtra: { ...s.subjectsExtra, [key]: (s.subjectsExtra[key] ?? 0) + minutes },
  });
}

/** Today's minutes before this demo session started. */
const TODAY_BASE = 50;
/** The six days before today, oldest first. */
const PAST_DAYS = [95, 40, 0, 130, 75, 110];
const SUBJECTS_BASE: Record<string, number> = { Calculus: 210, 'Operating systems': 145, English: 60, 'No subject': 35 };

function lastWeek(today: number): FocusDay[] {
  const now = new Date();
  return [...PAST_DAYS, today].map((minutes, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return { date: d.toLocaleDateString('en-CA'), minutes };
  });
}

export function useMyFocus() {
  const s = useFocusState();
  const today = TODAY_BASE + s.todayExtra;
  const days = lastWeek(today);
  const week = days.reduce((n, d) => n + d.minutes, 0);
  const subjects = { ...SUBJECTS_BASE };
  for (const [k, v] of Object.entries(s.subjectsExtra)) subjects[k] = (subjects[k] ?? 0) + v;
  return {
    today,
    week,
    /** Average over days you focused at all, so a day off doesn't feel like a failure. */
    dailyAverage: Math.round(week / Math.max(1, days.filter((d) => d.minutes > 0).length)),
    days,
    subjects: Object.entries(subjects)
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes),
  };
}

// --- Rankings ---

export function useGlobalOptIn() {
  const { onGlobal } = useFocusState();
  return [onGlobal, (v: boolean) => write({ onGlobal: v })] as const;
}

const u = (id: string) => USERS[id]!;
const stranger = (id: string, name: string, color: string): RankRow['user'] => ({
  id,
  name,
  handle: name.toLowerCase().replace(/\s/g, '_'),
  color,
  presence: 'focus',
});

/** This room, today: whoever focused here (members and guests alike). */
const ROOM_TODAY: Record<string, [string, number][]> = {
  chanom: [
    ['jod', 130],
    ['mai', 92],
    ['ploy', 15],
  ],
  cpe: [
    ['nam', 180],
    ['earth', 140],
    ['mook', 60],
  ],
};

const FRIENDS_RANK: Record<RankPeriod, [string, number][]> = {
  today: [
    ['jod', 130],
    ['mai', 92],
    ['nam', 70],
    ['ploy', 15],
    ['earth', 0],
    ['mook', 0],
  ],
  week: [
    ['nam', 820],
    ['mai', 690],
    ['jod', 455],
    ['earth', 300],
    ['ploy', 120],
    ['mook', 45],
  ],
};

const EVERYONE: Record<RankPeriod, [RankRow['user'], number][]> = {
  today: [
    [stranger('x1', 'Haru', '#5b8def'), 610],
    [stranger('x2', 'study_with_nene', '#e0457b'), 545],
    [stranger('x3', 'Minh', '#12a37f'), 500],
    [stranger('x4', 'Lukas', '#c47a2c'), 480],
    [stranger('x5', 'Aom', '#7c5cff'), 455],
    [stranger('x6', 'Sakura', '#ff6fa8'), 420],
    [stranger('x7', 'devi', '#2a9d8f'), 400],
    [stranger('x8', 'Pond', '#e76f51'), 390],
    [stranger('x9', 'Juno', '#6a4c93'), 370],
    [stranger('x10', 'Tae', '#3d5a80'), 360],
  ],
  week: [
    [stranger('x2', 'study_with_nene', '#e0457b'), 3710],
    [stranger('x1', 'Haru', '#5b8def'), 3480],
    [stranger('x6', 'Sakura', '#ff6fa8'), 3115],
    [stranger('x3', 'Minh', '#12a37f'), 2990],
    [stranger('x11', 'Kenji', '#264653'), 2805],
    [stranger('x5', 'Aom', '#7c5cff'), 2650],
    [stranger('x4', 'Lukas', '#c47a2c'), 2500],
    [stranger('x12', 'Fah', '#f4a261'), 2390],
    [stranger('x7', 'devi', '#2a9d8f'), 2280],
    [stranger('x9', 'Juno', '#6a4c93'), 2200],
  ],
};
/** Where you'd land on the Everyone ranking (the demo doesn't have the other ~40k rows). */
const MY_GLOBAL_RANK: Record<RankPeriod, number> = { today: 8412, week: 5307 };

const sortRows = (rows: RankRow[]) => [...rows].sort((a, b) => b.minutes - a.minutes);

export function useRoomToday(roomId: string): RankRow[] {
  const { today } = useMyFocus();
  const rows = (ROOM_TODAY[roomId] ?? []).map(([id, minutes]) => ({ user: u(id), minutes }));
  // Only what you focused in this room counts here; the demo treats all of today as this room's
  return sortRows([...rows, { user: ME, minutes: today }]).filter((r) => r.minutes > 0);
}

/** A ranking with your own row: inside the list if you're in the top, otherwise pinned under it. */
export function useRanking(scope: RankScope, period: RankPeriod): { rows: RankRow[]; me: { rank: number; minutes: number } | null } {
  const mine = useMyFocus();
  const [onGlobal] = useGlobalOptIn();
  const myMinutes = Math.min(period === 'today' ? mine.today : mine.week, period === 'today' ? DAILY_RANK_CAP_MIN : 7 * DAILY_RANK_CAP_MIN);
  if (scope === 'friends') {
    const rows = sortRows([...FRIENDS_RANK[period].map(([id, minutes]) => ({ user: u(id), minutes })), { user: ME, minutes: myMinutes }]);
    return { rows, me: { rank: rows.findIndex((r) => r.user.id === ME.id) + 1, minutes: myMinutes } };
  }
  const rows = EVERYONE[period].map(([user, minutes]) => ({ user, minutes }));
  return { rows, me: onGlobal ? { rank: MY_GLOBAL_RANK[period], minutes: myMinutes } : null };
}

export const formatMinutes = (m: number) => {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};
