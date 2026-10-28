'use client';

import { useEffect, useState } from 'react';
import type { RoomListing } from '@study/shared';
import { GAME_URL } from '@/lib/config';
import type { StudyRoom } from './roomSession';

/** Re-render when our own seat changes (cheap polling of synced state). */
export function useSeated(room: StudyRoom | null) {
  const [seated, setSeated] = useState(false);
  useEffect(() => {
    if (!room) return;
    const timer = setInterval(() => setSeated(!!room.state.players.get(room.sessionId)?.seatId), 150);
    return () => clearInterval(timer);
  }, [room]);
  return seated;
}

/** The room's display name (e.g. Library #2), looked up from the public room list. */
export function useRoomLabel(roomId: string | undefined) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!roomId) return;
    fetch(`${GAME_URL}/rooms`)
      .then((r) => r.json() as Promise<RoomListing[]>)
      .then((list) => setLabel(list.find((r) => r.roomId === roomId)?.label ?? null))
      .catch(() => {});
  }, [roomId]);
  return label;
}
