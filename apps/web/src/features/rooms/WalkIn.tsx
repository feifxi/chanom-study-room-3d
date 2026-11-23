'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Bell, Home, MessageCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGame, type GameEnd } from '@/features/game/useGame';
import { asServer, placeRoom } from '@/features/place/model';
import { readLook, saveLook } from '@/features/place/roomLook';
import { Scene } from '@/features/place/Scene';
import { useInRoom } from '@/features/presence/usePresence';
import { RoomLoader } from '@/features/room/RoomLoader';
import { PUBLIC_SERVER } from '@/lib/mock';
import { notifyWhenSpace, roomsApi, useRoom, type Room } from './useRooms';

/**
 * A room from the API, in 3D: you walk in through the game server (build step 4), which also tells
 * friends you're here. Activities, focus and the study panel are still the demo's until step 5.
 */
export function WalkIn({ room: initial, guestName }: { room: Room; guestName: string | null }) {
  const { data } = useRoom(initial.id, initial);
  const room = data ?? initial;
  // "Walk in here" (after opening the room in another tab) and "Try again" walk in afresh
  const [attempt, setAttempt] = useState(0);
  const game = useGame(room.id, attempt);
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
  // Inside: inbox items and DMs arrive as toasts
  useInRoom(game.status === 'in' ? room.id : null);

  if (game.status === 'connecting') {
    return (
      <Shade room={room}>
        <p className="animate-pulse text-center text-lg font-black text-white">Walking in… 🚪</p>
      </Shade>
    );
  }
  if (game.status === 'out') {
    return <CantWalkIn room={room} why={game.why} guest={guestName !== null} onRetry={() => setAttempt((n) => n + 1)} />;
  }
  return (
    <RoomLoader
      key={room.id}
      server={asServer(room)}
      place={room.me.role ? placeRoom(room) : undefined}
      roomId={room.mapId}
      guestName={guestName}
      game={game.room}
    />
  );
}

/** A Common room copy (still mock, feature 14). */
export function CommonRoom({ copyId, guestName }: { copyId: string; guestName: string | null }) {
  return <RoomLoader key={copyId} server={PUBLIC_SERVER} roomId={copyId} guestName={guestName} />;
}

/** The room's picture, dimmed, behind whatever stands in front of it. */
function Shade({ room, children }: { room: Room; children: ReactNode }) {
  return (
    <div className="fixed inset-0 isolate grid place-items-center p-4">
      <Scene roomId={room.id} mapId={room.mapId} className="fixed" emojiClass="text-[9rem]" />
      <div className="fixed inset-0 -z-10 bg-black/45 backdrop-blur-sm" />
      {children}
    </div>
  );
}

/** Why you're outside, mood first, with the one thing worth doing next. */
function CantWalkIn({ room, why, guest, onRetry }: { room: Room; why: GameEnd; guest: boolean; onRetry: () => void }) {
  const home = guest ? '/' : '/home';
  const chat = room.me.role ? `/r/${room.id}` : null;
  const copy: Record<GameEnd, { emoji: string; title: string; body: string }> = {
    full: {
      emoji: '🫧',
      title: `${room.name} is full`,
      body: `All ${room.capacity} spots are taken right now. We can tell you the moment one opens.`,
    },
    kicked: {
      emoji: '🚪',
      title: `You were taken out of ${room.name}`,
      body: 'The owner or a mod removed you. A new invite brings you back.',
    },
    banned: { emoji: '🙅', title: `You can’t come into ${room.name}`, body: 'The owner or a mod has banned you from this room.' },
    elsewhere: {
      emoji: '🪞',
      title: `You’re in ${room.name} in another tab`,
      body: 'You can be in a room once at a time. Walk in here instead?',
    },
    otherRoom: {
      emoji: '🚶',
      title: `You walked into another room`,
      body: `You can be in one room at a time, so you left ${room.name}. Come back any time.`,
    },
    gone: { emoji: '🍃', title: `${room.name} isn’t there any more`, body: 'The room was closed, or you’re no longer in it.' },
    unreachable: { emoji: '📡', title: 'Couldn’t reach the room', body: 'Check your connection, then try again.' },
  };
  const { emoji, title, body } = copy[why];
  return (
    <Shade room={room}>
      <div className="panel w-full max-w-sm rounded-3xl p-6 text-center">
        <p className="text-5xl">{emoji}</p>
        <h1 className="mt-3 text-xl font-black tracking-[-0.01em]">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex flex-col gap-2">
          {why === 'full' && !guest && (
            <Button className="h-11 rounded-full font-black" onClick={() => notifyWhenSpace(room.id, room.name)}>
              <Bell /> Notify me
            </Button>
          )}
          {(why === 'elsewhere' || why === 'otherRoom' || why === 'unreachable' || (why === 'full' && guest)) && (
            <Button className="h-11 rounded-full font-black" onClick={onRetry}>
              <RotateCw /> {why === 'elsewhere' ? 'Walk in here' : why === 'otherRoom' ? 'Walk back in' : 'Try again'}
            </Button>
          )}
          {chat && (why === 'full' || why === 'unreachable' || why === 'elsewhere' || why === 'otherRoom') && (
            <Button asChild variant="outline" className="h-11 rounded-full font-extrabold">
              <Link href={chat}>
                <MessageCircle /> Read the chat
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="h-11 rounded-full font-extrabold">
            <Link href={home}>
              <Home /> {guest ? 'Back to Connecta' : 'Go Home'}
            </Link>
          </Button>
        </div>
      </div>
    </Shade>
  );
}
