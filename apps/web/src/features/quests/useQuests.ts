'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { QuestDone } from '@connecta/shared';
import { useMe } from '@/features/account/useMe';
import { liveSocket } from '@/features/chat/live';
import { api, type Schemas } from '@/lib/api/client';

export type Quest = Schemas['QuestView'];

export const QUESTS_KEY = ['quests', 'today'] as const;

const signedUp = (me?: Schemas['Me'] | null) => !!me && !me.isGuest && me.signedUp;

/**
 * Your three quests today and your coins (spec 15). The servers count everything (the game server
 * what happens in rooms, the API Room chat); this only shows it, and refreshes when they say so.
 */
export function useQuests(): { coins: number; quests: Quest[] } {
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: QUESTS_KEY,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/quests/today');
      if (!data) throw new Error(`${response.status}`);
      return data;
    },
    enabled: signedUp(me),
    // A new day starts at your midnight: look again now and then
    refetchInterval: 10 * 60_000,
  });
  return { coins: data?.coins ?? 0, quests: data?.quests ?? [] };
}

/** Mounted once for the whole app: the lists refresh live, and a finished quest pays with a toast. */
export function QuestsListener() {
  const { data: me } = useMe();
  const client = useQueryClient();
  const on = signedUp(me);
  useEffect(() => {
    if (!on) return;
    const socket = liveSocket();
    const refresh = () => void client.invalidateQueries({ queryKey: QUESTS_KEY });
    const onDone = (done: QuestDone) => {
      toast.success(`🎯 ${done.title} · +${done.coins} 🪙`);
      refresh();
    };
    socket.on('quests', refresh);
    socket.on('quest:done', onDone);
    return () => {
      socket.off('quests', refresh);
      socket.off('quest:done', onDone);
    };
  }, [on, client]);
  return null;
}
