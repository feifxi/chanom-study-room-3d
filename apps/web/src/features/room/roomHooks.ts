'use client';

import { useEffect, useState } from 'react';
import { SEAT_BY_ID, TABLES, type RoomListing } from '@study/shared';
import { GAME_URL } from '@/lib/config';
import type { StudyRoom } from './roomSession';

export interface MySeat {
  seatId: string;
  /** "Table 3" or "Sofa"; null while standing. */
  place: string | null;
  /** People sitting in the same table group, you included. */
  placeCount: number;
}

const NOT_SEATED: MySeat = { seatId: '', place: null, placeCount: 0 };

/** Human name for a seat group. */
export function placeName(seatId: string) {
  const seat = SEAT_BY_ID.get(seatId);
  if (!seat) return null;
  return seat.kind === 'sofa' ? 'Sofa' : `Table ${TABLES.findIndex((t) => t.id === seat.tableId) + 1}`;
}

/** Where you're sitting and who's with you (cheap polling of synced state). */
export function useMySeat(room: StudyRoom | null): MySeat {
  const [mine, setMine] = useState<MySeat>(NOT_SEATED);
  useEffect(() => {
    if (!room) return;
    const timer = setInterval(() => {
      const seatId = room.state.players?.get(room.sessionId)?.seatId ?? '';
      const group = SEAT_BY_ID.get(seatId)?.tableId;
      let placeCount = 0;
      if (group) room.state.players.forEach((p) => SEAT_BY_ID.get(p.seatId)?.tableId === group && placeCount++);
      setMine((prev) =>
        prev.seatId === seatId && prev.placeCount === placeCount ? prev : { seatId, place: seatId ? placeName(seatId) : null, placeCount },
      );
    }, 250);
    return () => {
      clearInterval(timer);
      setMine(NOT_SEATED);
    };
  }, [room]);
  return mine;
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
