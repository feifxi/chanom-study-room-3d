import { USERS, type User } from './mock';

/**
 * What's left of the study tools' mock data: "This room today" in the demo's mock rooms (Common
 * rooms until feature 14). The timer, to-do list, Focus page and rankings are on the API
 * (`features/focus/`).
 */

export interface RankRow {
  user: Pick<User, 'id' | 'name' | 'handle' | 'color' | 'presence'>;
  minutes: number;
}

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

/** A mock room's "today" (a real room's comes from useRoomToday in features/focus). */
export function useRoomToday(roomId: string): RankRow[] {
  return (ROOM_TODAY[roomId] ?? []).map(([id, minutes]) => ({ user: USERS[id]!, minutes }));
}

export const formatMinutes = (m: number) => {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};
