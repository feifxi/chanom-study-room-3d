'use client';

import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { COINS } from './mock';

/**
 * Daily quests and coins (decided 2026-11-09). Coins are only earned, never bought; they buy
 * cosmetics in the Shop (premium skins come with Plus instead).
 *
 * Every quest counts ONE thing the server already sees (focus timer minutes, time connected to a
 * room with someone else, bubbles and messages sent, a cat petted, an activity finished), so there's
 * no hard detection: no "with a friend", no "3 different people". A daily cap makes cheating pointless.
 * Each day picks one quest per group, so there's always a calm one for people in Quiet rooms.
 */
export type QuestGroup = 'focus' | 'together' | 'play';

export interface QuestDef {
  id: string;
  group: QuestGroup;
  emoji: string;
  title: string;
  goal: number;
  /** Shown after the progress, e.g. "12 / 60 min". */
  unit?: string;
  coins: number;
}

export const QUEST_POOL: QuestDef[] = [
  { id: 'focus-60', group: 'focus', emoji: '📖', title: 'Focus for 1 hour', goal: 60, unit: 'min', coins: 25 },
  { id: 'pomo-2', group: 'focus', emoji: '🍅', title: 'Finish 2 focus sessions', goal: 2, coins: 25 },
  { id: 'room-30', group: 'together', emoji: '🏠', title: 'Spend 30 min in a room with others', goal: 30, unit: 'min', coins: 20 },
  { id: 'say-5', group: 'together', emoji: '💬', title: 'Say 5 things (bubbles or Room chat)', goal: 5, coins: 20 },
  { id: 'pet-3', group: 'play', emoji: '🐈', title: 'Pet a cat 3 times', goal: 3, coins: 15 },
  { id: 'buddy-1', group: 'play', emoji: '🤖', title: 'Use the Buddy Machine', goal: 1, coins: 15 },
  // Joins the pool once the activity framework exists (features 9–12): one "round finished" event for every game
  { id: 'activity-1', group: 'play', emoji: '🎲', title: 'Play any activity once', goal: 1, coins: 15 },
];

/** Today's three. The real server picks per user per day; the demo picks ones you can do in the Library. */
export const TODAY = ['focus-60', 'say-5', 'pet-3'].map((id) => QUEST_POOL.find((q) => q.id === id)!);

interface State {
  coins: number;
  progress: Record<string, number>;
}

const KEY = 'connecta:quests';
const EVENT = 'connecta:quests';
const INITIAL: State = { coins: COINS, progress: { 'focus-60': 12 } };
let cached: { raw: string | null; state: State } | null = null;

function read(): State {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    // Blocked storage: the demo just starts fresh
  }
  if (cached && cached.raw === raw) return cached.state;
  cached = { raw, state: raw ? (JSON.parse(raw) as State) : INITIAL };
  return cached.state;
}

function write(state: State) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore: progress just isn't kept
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function useQuests() {
  const state = useSyncExternalStore(subscribe, read, () => INITIAL);
  return { coins: state.coins, quests: TODAY.map((q) => ({ ...q, progress: Math.min(q.goal, state.progress[q.id] ?? 0) })) };
}

/** Count one step towards a quest (if it's one of today's); pays out once when it's done. */
export function questProgress(id: string, by = 1) {
  const q = TODAY.find((d) => d.id === id);
  if (!q) return;
  const s = read();
  const before = s.progress[id] ?? 0;
  if (before >= q.goal) return;
  const after = Math.min(q.goal, before + by);
  const done = after >= q.goal;
  write({ coins: s.coins + (done ? q.coins : 0), progress: { ...s.progress, [id]: after } });
  if (done) toast.success(`🎯 ${q.title} · +${q.coins} 🪙`);
}

/** Spend coins in the Shop; false when there aren't enough. */
export function spendCoins(n: number) {
  const s = read();
  if (s.coins < n) return false;
  write({ ...s, coins: s.coins - n });
  return true;
}

/** Demo: one step on every quest, to see progress and payouts without waiting. */
export function nudgeQuests() {
  for (const q of TODAY) questProgress(q.id, q.unit === 'min' ? 10 : 1);
}
