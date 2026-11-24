'use client';

import { useQuery } from '@tanstack/react-query';
import { DAILY_RANK_CAP_MIN } from '@connecta/shared';
import { api } from '@/lib/api/client';
import type { LiveRoom } from '../room3d/liveRoom';

export interface TodayRow {
  key: string;
  name: string;
  minutes: number;
  me: boolean;
}

const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * "Focus in this room today": members' saved rounds from the API (since your midnight), plus what the
 * game server knows live: rounds finished since the room opened (guests' too, never saved) and the
 * minutes of rounds running now. Saved and finished-here count the same rounds, so the larger wins.
 */
export function useRoomToday(live: LiveRoom, roomId: string | undefined, now: number): TodayRow[] {
  const players = [...live.state.players.entries()];
  // A round that just ended changes someone's todayMin: fetch the saved numbers again
  const finished = players.reduce((n, [, p]) => n + p.todayMin, 0);
  const { data } = useQuery({
    queryKey: ['focus', 'today', roomId, finished],
    enabled: !!roomId,
    queryFn: async () => {
      const { data } = await api.GET('/api/rooms/{id}/focus/today', {
        params: { path: { id: roomId! }, query: { tz: browserTimeZone() } },
      });
      return data?.rows ?? [];
    },
    // The worker saves a round a moment after it ends; the live numbers cover the gap
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
  const rows = new Map<string, TodayRow>();
  for (const r of data ?? []) rows.set(r.person.id, { key: r.person.id, name: r.person.name, minutes: r.minutes, me: false });
  for (const [id, p] of players) {
    const key = p.userId || id;
    const running = p.status === 'focus' && p.focusSince ? Math.max(0, Math.floor((now - p.focusSince) / 60_000)) : 0;
    const saved = rows.get(key)?.minutes ?? 0;
    rows.set(key, { key, name: p.name, minutes: Math.min(Math.max(saved, p.todayMin) + running, DAILY_RANK_CAP_MIN), me: id === 'me' });
  }
  return [...rows.values()].filter((r) => r.minutes > 0).sort((a, b) => b.minutes - a.minutes);
}

/** Keeps your account's time zone in step with this browser, so your focus days start at your midnight. */
export async function syncTimeZone(current: string) {
  const tz = browserTimeZone();
  if (tz && tz !== current) await api.PUT('/api/me/time-zone', { body: { timeZone: tz } });
}
