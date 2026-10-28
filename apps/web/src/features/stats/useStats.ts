'use client';

import { useEffect, useState } from 'react';
import type { LeaderRowView, VisitorStatsView } from '@study/shared';
import { GAME_URL } from '@/lib/config';

export interface StatsState {
  /** null while loading or when stats are disabled on the server */
  stats: VisitorStatsView | null;
  leaders: LeaderRowView[] | null;
  enabled: boolean;
}

/** Fetch my study stats and the weekly leaderboard (refreshes every minute). */
export function useStats(visitorId: string | undefined): StatsState {
  const [state, setState] = useState<StatsState>({ stats: null, leaders: null, enabled: true });
  useEffect(() => {
    if (!visitorId) return;
    let alive = true;
    const load = async () => {
      try {
        const [s, l] = await Promise.all([fetch(`${GAME_URL}/stats/${visitorId}`), fetch(`${GAME_URL}/leaderboard?period=week`)]);
        if (!alive) return;
        if (s.status === 503) return setState({ stats: null, leaders: null, enabled: false });
        setState({ stats: await s.json(), leaders: await l.json(), enabled: true });
      } catch {
        // Server offline: leave the last values in place
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [visitorId]);
  return state;
}

/** 95 → "1 ชม. 35 น.", 40 → "40 น." */
export function formatMinutes(min: number) {
  const m = Math.round(min);
  if (m < 60) return `${m} น.`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} ชม. ${m % 60} น.` : `${h} ชม.`;
}
