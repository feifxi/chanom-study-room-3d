'use client';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type Schemas } from '@/lib/api/client';
import { useMe, useSetMe } from '@/features/account/useMe';

export type MyFocus = Schemas['MyFocus'];
export type Ranking = Schemas['Ranking'];
export type RankScope = 'friends' | 'everyone';
export type RankPeriod = 'today' | 'week';

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** My numbers on the Focus page (only you): the last 7 days in your time zone, and minutes per subject. */
export function useMyFocus() {
  return useQuery({
    queryKey: ['focus', 'me'],
    queryFn: async () => (await api.GET('/api/focus/me', { params: { query: { tz: tz() } } })).data ?? null,
  });
}

/** Friends or Everyone, today or this week (Everyone updates every few minutes on the server). */
export function useRanking(scope: RankScope, period: RankPeriod) {
  return useQuery({
    queryKey: ['focus', 'ranking', scope, period],
    queryFn: async () => (await api.GET('/api/focus/rankings', { params: { query: { scope, period, tz: tz() } } })).data ?? null,
    placeholderData: (previous) => previous,
  });
}

/** "Show me on the Everyone focus ranking": an account setting (default on 18+, off under 18). */
export function useShowOnEveryone() {
  const { data: me } = useMe();
  const setMe = useSetMe();
  const set = async (showOnEveryone: boolean) => {
    const { data } = await api.PATCH('/api/me/privacy', { body: { showOnEveryone } });
    if (!data) return void toast.error('Couldn’t save that. Try again?');
    setMe(data);
  };
  return [me?.showOnEveryone ?? false, set] as const;
}
