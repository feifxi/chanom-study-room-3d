'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Compass, RotateCw } from 'lucide-react';
import { COMMON_CAPACITY, type CommonType } from '@connecta/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useGame, type GameEnd, type TicketFor } from '@/features/game/useGame';
import { Scene } from '@/features/place/Scene';
import { useInRoom } from '@/features/presence/usePresence';
import { RoomLoader } from '@/features/room/RoomLoader';
import { api } from '@/lib/api/client';
import { PUBLIC_SERVER, type Server } from '@/lib/mock';

interface Copy {
  place: string;
  n: number;
  name: string;
}

/**
 * Walking into a Common room (feature 14): the API picks the copy (a friend's, the busiest with
 * space, or a new one) and gives its ticket; the game server makes it text only. "Try again" and a
 * reconnect go back to the same copy while it has a seat.
 */
export function CommonWalkIn({ type, withId, guestName }: { type: CommonType; withId: string | null; guestName: string | null }) {
  const [attempt, setAttempt] = useState(0);
  const [copy, setCopy] = useState<Copy | null>(null);
  const last = useRef<number | undefined>(undefined);
  const join: TicketFor = async () => {
    const { data, error, response } = await api.POST('/api/common/{type}/ticket', {
      params: { path: { type: type.id } },
      body: { with: withId ?? undefined, copy: last.current },
    });
    // Out of Common rooms for a while after enough reports
    // Out of Common rooms for a while: the team removed you, or enough people reported you
    if (response.status === 403) return { why: (error as { by?: string } | undefined)?.by === 'team' ? 'kicked' : 'banned' };
    if (!data) return { why: 'unreachable' };
    last.current = data.n;
    setCopy({ place: data.place, n: data.n, name: data.name });
    if (data.note) toast(data.note);
    return { place: data.place, ticket: data.ticket };
  };
  const game = useGame(`common:${type.id}`, attempt, join);
  useInRoom(game.status === 'in' && copy ? copy.place : null);

  if (game.status === 'connecting' || (game.status === 'in' && !copy)) {
    return (
      <Shade mapId={type.mapId}>
        <p className="animate-pulse text-center text-lg font-black text-white">Finding you a seat… 🏛️</p>
      </Shade>
    );
  }
  if (game.status === 'out')
    return <CantWalkIn type={type} why={game.why} guest={guestName !== null} onRetry={() => setAttempt((n) => n + 1)} />;
  const server: Server = {
    ...PUBLIC_SERVER,
    rooms: [
      {
        id: copy!.place,
        name: copy!.name,
        mapId: type.mapId,
        capacity: COMMON_CAPACITY,
        allowGuests: true,
        roomWideGames: type.roomWideGames,
        people: [],
        happening: type.vibe,
      },
    ],
  };
  return <RoomLoader key={copy!.place} server={server} roomId={copy!.place} guestName={guestName} game={game.room} />;
}

function Shade({ mapId, children }: { mapId: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 isolate grid place-items-center p-4">
      <Scene roomId={`common:${mapId}`} mapId={mapId} className="fixed" emojiClass="text-[9rem]" />
      <div className="fixed inset-0 -z-10 bg-black/45 backdrop-blur-sm" />
      {children}
    </div>
  );
}

function CantWalkIn({ type, why, guest, onRetry }: { type: CommonType; why: GameEnd; guest: boolean; onRetry: () => void }) {
  const copy: Partial<Record<GameEnd, { emoji: string; title: string; body: string }>> = {
    full: { emoji: '🫧', title: 'That copy just filled up', body: 'Try again and we’ll find you another seat.' },
    kicked: { emoji: '🚪', title: 'You were taken out', body: 'The Connecta team took you out of Common rooms for an hour.' },
    banned: {
      emoji: '🙅',
      title: 'You can’t come into Common rooms for now',
      body: 'Several people here reported you, so you’re out of Common rooms for an hour.',
    },
    elsewhere: {
      emoji: '🪞',
      title: `You’re in the ${type.name} in another tab`,
      body: 'You can be in one room at a time. Walk in here instead?',
    },
    otherRoom: { emoji: '🚶', title: 'You walked into another room', body: `You left the ${type.name}. Come back any time.` },
  };
  const { emoji, title, body } = copy[why] ?? {
    emoji: '📡',
    title: 'Couldn’t reach the room',
    body: 'Check your connection, then try again.',
  };
  return (
    <Shade mapId={type.mapId}>
      <div className="panel w-full max-w-sm rounded-3xl p-6 text-center">
        <p className="text-5xl">{emoji}</p>
        <h1 className="mt-3 text-xl font-black tracking-[-0.01em]">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex flex-col gap-2">
          {why !== 'kicked' && why !== 'banned' && (
            <Button className="h-11 rounded-full font-black" onClick={onRetry}>
              <RotateCw /> {why === 'elsewhere' ? 'Walk in here' : why === 'otherRoom' ? 'Walk back in' : 'Try again'}
            </Button>
          )}
          <Button asChild variant="ghost" className="h-11 rounded-full font-extrabold">
            <Link href={guest ? '/' : '/discover'}>
              <Compass /> {guest ? 'Back to Connecta' : 'Back to Discover'}
            </Link>
          </Button>
        </div>
      </div>
    </Shade>
  );
}
