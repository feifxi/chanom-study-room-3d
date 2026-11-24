'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Me } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';
import { closeLive } from '@/features/chat/live';
import { syncTimeZone } from '@/features/focus/useRoomToday';
import { DEFAULT_LOOK } from '@connecta/shared';
import type { User } from '@/lib/roomShape';

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
 * The signed-in account in the User shape the avatar and name tag take: your name, look, Plus, and
 * online unless you chose to appear offline. Empty while it loads.
 */
export function useMeAsUser(): User {
  const { data: me } = useMe();
  const look = me?.look ?? DEFAULT_LOOK;
  return {
    id: 'me',
    name: me?.name ?? '',
    handle: me?.handle ?? '',
    // The avatar's circle takes your outfit colour
    color: look.outfit,
    look,
    presence: me?.appearOffline ? 'offline' : 'online',
    plus: !!me?.plus,
  };
}

/** No finished account here: signed out, or a guest let in by a link or a Common room */
export function useIsGuest(): boolean {
  const { data: me } = useMe();
  return !me || me.isGuest || !me.signedUp;
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
