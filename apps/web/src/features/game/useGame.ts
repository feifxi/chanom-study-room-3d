'use client';

import { useEffect, useState } from 'react';
import { Client, type Room } from '@colyseus/sdk';
import {
  GAME_CLOSE,
  GAME_ROOM,
  type ChessView,
  type GameJoinOptions,
  type NpcView,
  type PlayerView,
  type SideView,
  type SlaveView,
  type TelView,
  type SpotView,
  type WatchView,
} from '@connecta/shared';
import { api } from '@/lib/api/client';

/** The game server's state as the web app reads it (apps/game/src/state.ts). */
export interface GameState {
  mapId: string;
  players: Map<string, PlayerView>;
  npcs: Map<string, NpcView>;
  /** Watch together's big screen (feature 10) */
  watch?: WatchView;
  /** The activity spots the game server runs (feature 9) */
  spots?: Map<string, SpotView>;
  chess?: ChessView;
  slave?: SlaveView;
  side?: SideView;
  tel?: TelView;
  /** The Connecta team's notice in Common rooms ('' for none), until noticeUntil (ms) */
  notice?: string;
  noticeUntil?: number;
}
export type GameRoom = Room<unknown, GameState>;

/** Why you're not (or no longer) in the room. */
export type GameEnd = 'full' | 'kicked' | 'banned' | 'closed' | 'elsewhere' | 'otherRoom' | 'gone' | 'unreachable';

export type GameSession = { status: 'connecting' } | { status: 'in'; room: GameRoom } | { status: 'out'; why: GameEnd };

const CLOSED: Record<number, GameEnd> = {
  [GAME_CLOSE.kicked]: 'kicked',
  [GAME_CLOSE.banned]: 'banned',
  [GAME_CLOSE.elsewhere]: 'elsewhere',
  [GAME_CLOSE.otherRoom]: 'otherRoom',
  [GAME_CLOSE.gone]: 'gone',
  [GAME_CLOSE.closed]: 'closed',
};

/**
 * Walks into a room's game server (apps/game): a one-minute ticket from the API, then the Colyseus
 * room for this Connecta room. The web app reaches it at /game on its own origin (nginx, or a Next
 * rewrite locally). Dropped connections come back by themselves (the SDK retries; the server keeps
 * your place 20 s). `attempt` walks in again (after "Walk in here"). `join` gets the ticket another
 * way (a Common room copy, where the API picks which copy).
 */
export type TicketFor = () => Promise<{ place: string; ticket: string } | { why: GameEnd }>;

export function useGame(roomId: string, attempt = 0, join?: TicketFor): GameSession {
  // Each walk-in's result is kept with its key, so a new attempt reads as connecting until it lands
  const key = `${roomId}:${attempt}`;
  const [result, setResult] = useState<{ key: string; session: GameSession } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let joined: GameRoom | null = null;
    const setSession = (session: GameSession) => setResult({ key: `${roomId}:${attempt}`, session });
    // On the next tick, so a mount that's undone at once (React's development double-mount) never
    // connects: a second connection would take over from the first ("one of you per room")
    const start = setTimeout(async () => {
      try {
        const got = join ? await join() : await roomTicket(roomId);
        if ('why' in got) {
          if (!cancelled) setSession({ status: 'out', why: got.why });
          return;
        }
        const client = new Client(`${window.location.origin}/game`);
        const options: GameJoinOptions = { place: got.place, ticket: got.ticket };
        const room = (await client.joinOrCreate(GAME_ROOM, options)) as GameRoom;
        if (cancelled) return void room.leave();
        joined = room;
        room.onLeave((code) => {
          if (!cancelled) setSession({ status: 'out', why: CLOSED[code] ?? 'unreachable' });
        });
        setSession({ status: 'in', room });
      } catch (e) {
        if (cancelled) return;
        setSession({ status: 'out', why: e instanceof Error && /full/.test(e.message) ? 'full' : 'unreachable' });
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(start);
      void joined?.leave();
    };
    // `join` is read when walking in; a new roomId or attempt walks in again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, attempt]);

  return result?.key === key ? result.session : { status: 'connecting' };
}

/** A room's own ticket: members and guest pass holders */
async function roomTicket(roomId: string): Promise<{ place: string; ticket: string } | { why: GameEnd }> {
  const res = await api.POST('/api/rooms/{id}/ticket', { params: { path: { id: roomId } } });
  if (res.data) return res.data;
  const code = (res.error as { code?: string } | undefined)?.code;
  return { why: code === 'banned' ? 'banned' : code === 'closed' ? 'closed' : 'gone' };
}
