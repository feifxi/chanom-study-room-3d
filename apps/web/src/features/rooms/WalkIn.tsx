'use client';

import { useEffect, useState } from 'react';
import { asServer, placeRoom } from '@/features/place/model';
import { readLook, saveLook } from '@/features/place/roomLook';
import { RoomLoader } from '@/features/room/RoomLoader';
import { PUBLIC_SERVER } from '@/lib/mock';
import { roomsApi, useRoom, type Room } from './useRooms';

/**
 * A room from the API, in 3D. The 3D view still runs on the demo's mock people and old room shape
 * until walking in is ported (build step 4); the room's name, map, look, settings and your role are real.
 */
export function WalkIn({ room: initial, guestName }: { room: Room; guestName: string | null }) {
  const { data } = useRoom(initial.id, initial);
  const room = data ?? initial;
  // The 3D view reads the room's look from this browser's store: fill it from the saved room before
  // it mounts (it only renders in the browser; on the server there's no store and nothing to do)
  useState(() => {
    if (typeof window !== 'undefined') {
      saveLook(initial.id, { ...readLook(initial.id, initial.mapId), mapId: initial.mapId, size: initial.size, time: initial.time });
    }
  });

  useEffect(() => {
    if (room.me.role) roomsApi.visit(room.id).catch(() => {});
  }, [room.id, room.me.role]);

  return (
    <RoomLoader
      key={room.id}
      server={asServer(room)}
      place={room.me.role ? placeRoom(room) : undefined}
      roomId={room.mapId}
      guestName={guestName}
    />
  );
}

/** A Common room copy (still mock, feature 14). */
export function CommonRoom({ copyId, guestName }: { copyId: string; guestName: string | null }) {
  return <RoomLoader key={copyId} server={PUBLIC_SERVER} roomId={copyId} guestName={guestName} />;
}
