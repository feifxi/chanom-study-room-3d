/**
 * Daily quests and coins (spec 15, docs/v2/features/15-business-infra.md#coins-and-daily-quests).
 * Coins are earned, never bought. Each quest counts ONE thing the server already sees, so there's
 * nothing to detect ("with a friend" or "3 different people" never appear), and each pays once a day.
 * Three a day, one per group, so someone studying in a quiet room can still earn.
 */
export type QuestGroup = 'focus' | 'together' | 'play';

/** What a quest counts: the game server reports these, and the API counts Room chat itself */
export type QuestCount = 'focusMinutes' | 'focusRounds' | 'roomMinutes' | 'said' | 'pets' | 'buddy' | 'played';

export interface QuestDef {
  id: string;
  group: QuestGroup;
  emoji: string;
  title: string;
  counts: QuestCount;
  goal: number;
  /** Shown after the progress, e.g. "12 / 60 min" */
  unit?: string;
  coins: number;
}

export const QUEST_POOL: readonly QuestDef[] = [
  { id: 'focus-60', group: 'focus', emoji: '📖', title: 'Focus for 1 hour', counts: 'focusMinutes', goal: 60, unit: 'min', coins: 25 },
  { id: 'pomo-2', group: 'focus', emoji: '🍅', title: 'Finish 2 focus sessions', counts: 'focusRounds', goal: 2, coins: 25 },
  {
    id: 'room-30',
    group: 'together',
    emoji: '🏠',
    title: 'Spend 30 min in a room with others',
    counts: 'roomMinutes',
    goal: 30,
    unit: 'min',
    coins: 20,
  },
  { id: 'say-5', group: 'together', emoji: '💬', title: 'Say 5 things (bubbles or Room chat)', counts: 'said', goal: 5, coins: 20 },
  { id: 'pet-3', group: 'play', emoji: '🐈', title: 'Pet a cat 3 times', counts: 'pets', goal: 3, coins: 15 },
  { id: 'buddy-1', group: 'play', emoji: '🤖', title: 'Use the Buddy Machine', counts: 'buddy', goal: 1, coins: 15 },
  { id: 'activity-1', group: 'play', emoji: '🎲', title: 'Play any activity once', counts: 'played', goal: 1, coins: 15 },
];

const GROUPS: readonly QuestGroup[] = ['focus', 'together', 'play'];

/** FNV-1a: a small stable hash, so a person's quests for a day are the same everywhere */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** A person's three for a day (yyyy-mm-dd in their own time zone): one per group, fixed for the day */
export function questsFor(userId: string, day: string): QuestDef[] {
  return GROUPS.map((group) => {
    const options = QUEST_POOL.filter((q) => q.group === group);
    return options[hash(`${userId}:${day}:${group}`) % options.length]!;
  });
}

/** One thing that happened, from the game server to the API (a job on this queue) */
export const QUESTS_QUEUE = 'quest-events';
export interface QuestEvent {
  userId: string;
  counts: QuestCount;
  amount: number;
  /** Epoch ms: the day it counts for, in the person's time zone */
  at: number;
}

export interface QuestView {
  id: string;
  emoji: string;
  title: string;
  goal: number;
  unit?: string;
  coins: number;
  progress: number;
}

/** Live to you (`quest:done`) when a quest pays out: the toast, and the new balance */
export interface QuestDone {
  id: string;
  emoji: string;
  title: string;
  coins: number;
  balance: number;
}
