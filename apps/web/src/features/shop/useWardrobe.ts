'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe, useSetMe } from '@/features/account/useMe';
import { QUESTS_KEY } from '@/features/quests/useQuests';
import { api, type Schemas } from '@/lib/api/client';
import type { AvatarLook } from '@connecta/shared';
import { lookWait, saveMyLook } from '@/lib/myLook';

export const WARDROBE_KEY = ['shop', 'wardrobe'] as const;

const signedUp = (me?: Schemas['Me'] | null) => !!me && !me.isGuest && me.signedUp;

/** Your coins and the Shop items you own (docs/features/14-coins-and-shop.md) */
export function useWardrobe() {
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: WARDROBE_KEY,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/shop/wardrobe');
      if (!data) throw new Error(`${response.status}`);
      return data;
    },
    enabled: signedUp(me),
  });
  return { owned: data?.owned ?? [], pets: data?.pets ?? [], ready: !!data };
}

/** Buy with coins: resolves with an error message when it didn't work */
export function useBuy() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }): Promise<string | null> => {
      const { data, error } = await api.POST('/api/shop/items/{id}/buy', { params: { path: { id } }, body: { name } });
      if (!data) return (error as { message?: string } | undefined)?.message ?? 'Couldn’t buy it. Try again?';
      client.setQueryData(WARDROBE_KEY, data);
      void client.invalidateQueries({ queryKey: QUESTS_KEY });
      return null;
    },
  });
}

/**
 * Save your look: to your account (the API checks you own its Shop items and shows it in every room
 * you're in), then here. Guests' looks live on their guest pass, so only accounts save to the API.
 */
export function useSaveLook() {
  const { data: me } = useMe();
  const setMe = useSetMe();
  return async (look: AvatarLook): Promise<{ ok: true } | { ok: false; message: string }> => {
    const wait = lookWait();
    if (wait) return { ok: false, message: `One more sec: you can change again in ${wait} s` };
    if (me?.signedUp) {
      const { data, error } = await api.PATCH('/api/me/profile', { body: { look } });
      if (!data)
        return { ok: false, message: (error as { message?: string } | undefined)?.message ?? 'Couldn’t save your look. Try again?' };
      setMe(data);
    }
    saveMyLook(look);
    return { ok: true };
  };
}
