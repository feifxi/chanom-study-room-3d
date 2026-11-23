'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Me } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';
import { closeLive } from '@/features/chat/live';
import { syncTimeZone } from '@/features/focus/useRoomToday';
import { ME as MOCK_ME, type User } from '@/lib/mock';

export const ME_KEY = ['me'] as const;

/** Who's signed in: a full account, a guest, or null. */
export async function fetchMe(): Promise<Me | null> {
  const { data, response } = await api.GET('/api/me');
  if (response.status === 401) return null;
  if (!data) throw new Error(`Couldn't load your account (${response.status})`);
  // Quietly, in the background: focus days follow the time zone you're in now
  if (!data.isGuest && typeof window !== 'undefined') void syncTimeZone(data.timeZone).catch(() => {});
  return data;
}

export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 60_000 });
}

/** Settings → Account's private details (email, birthday, linked sign-ins, next handle change). */
export function useAccountDetails() {
  return useQuery({
    queryKey: [...ME_KEY, 'account'],
    queryFn: async () => {
      const { data, response } = await api.GET('/api/me/account');
      if (!data) throw new Error(`Couldn't load your account (${response.status})`);
      return data;
    },
  });
}

/** Puts a fresh Me (from a sign-up step's response) into the cache. */
export function useSetMe() {
  const client = useQueryClient();
  return (me: Me | null) => client.setQueryData(ME_KEY, me);
}

/**
 * The signed-in account in the mock User shape the not-yet-ported screens use (avatar, name tag).
 * Only the account's own fields are real; presence, Plus and the rest stay mock until their features
 * move to the API.
 */
export function useMeAsUser(): User {
  const { data: me } = useMe();
  if (!me) return MOCK_ME;
  return { ...MOCK_ME, name: me.name, handle: me.handle ?? MOCK_ME.handle, look: me.look ?? MOCK_ME.look };
}

/** Signs out here and forgets everything cached about the account. */
export function useSignOut() {
  const client = useQueryClient();
  return async () => {
    await authClient.signOut();
    closeLive();
    client.clear();
  };
}
