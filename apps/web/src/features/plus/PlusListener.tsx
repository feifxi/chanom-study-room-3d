'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ME_KEY, useMe } from '@/features/account/useMe';
import { liveSocket } from '@/features/chat/live';
import { ROOMS_KEY } from '@/features/rooms/useRooms';

/** Plus started or ended (any tab, later a payment): your account and your rooms' limits refresh */
export function PlusListener() {
  const { data: me } = useMe();
  const client = useQueryClient();
  const on = !!me?.signedUp;
  useEffect(() => {
    if (!on) return;
    const socket = liveSocket();
    const refresh = () => {
      void client.invalidateQueries({ queryKey: ME_KEY });
      void client.invalidateQueries({ queryKey: ROOMS_KEY });
    };
    socket.on('plus', refresh);
    return () => {
      socket.off('plus', refresh);
    };
  }, [on, client]);
  return null;
}
