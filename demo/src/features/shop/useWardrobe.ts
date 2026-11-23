'use client';

import { useState } from 'react';
import { shopItem, type AvatarLook } from '@connecta/shared';
import { saveMyLook } from '@/lib/myLook';
import { spendCoins } from '@/lib/quests';
import { addOwned, useOwned } from '@/lib/wardrobe';

/**
 * Demo stand-ins for the real app's Shop hooks (apps/web features/shop/useWardrobe): the same shape,
 * kept in this tab. Pets keep their own names here (the real app saves the name you pick).
 */
export function useWardrobe() {
  const owned = useOwned();
  const pets = owned.flatMap((id) => {
    const item = shopItem(id);
    return item?.kind === 'pet' ? [{ item: id, coat: item.value, name: item.name }] : [];
  });
  return { owned, pets, ready: true };
}

export function useBuy() {
  const [isPending] = useState(false);
  return {
    isPending,
    mutateAsync: async ({ id }: { id: string; name?: string }): Promise<string | null> => {
      const item = shopItem(id);
      if (!item) return 'That isn’t in the Shop';
      if (!spendCoins(item.price)) return 'Not enough coins yet';
      addOwned(id);
      return null;
    },
  };
}

export function useSaveLook() {
  return async (look: AvatarLook): Promise<{ ok: true } | { ok: false; message: string }> => {
    const r = saveMyLook(look);
    return r.ok ? { ok: true } : { ok: false, message: `One more sec: you can change again in ${r.waitS} s` };
  };
}
