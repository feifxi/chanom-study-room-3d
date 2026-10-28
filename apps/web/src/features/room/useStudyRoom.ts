'use client';

import { useEffect, useRef, useState } from 'react';
import { Callbacks, Client, type Room } from '@colyseus/sdk';
import { ROOM_NAME, type ChatMessage, type GachaSpun, type JoinOptions, type StudyStateView } from '@study/shared';
import { GAME_URL } from '@/lib/config';

export type StudyRoom = Room<any, StudyStateView>;

export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'closed';

const BUBBLE_MS = 4500;

export interface Bubble {
  text: string;
  until: number;
}

/** A floating emote (hearts, sparkles) above a player or NPC label. */
export interface Reaction {
  key: string;
  /** Label id: a session id, or `npc:<id>` */
  target: string;
  emote: string;
}

/** NPC labels and bubbles share the player label board, keyed like this. */
export const npcKey = (id: string) => `npc:${id}`;

/**
 * Joins a study room (a specific one by id, or any open one) and exposes the
 * live Colyseus room plus the React-level bits: who's here and the chat log.
 * Positions are read straight from `room.state` every frame, not via React.
 */
export function useStudyRoom(roomId: string | null, getOptions: () => JoinOptions) {
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const [npcIds, setNpcIds] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  /** Every Buddy Machine spin in this room (the latest drives the machine animation). */
  const [spins, setSpins] = useState<(GachaSpun & { at: number })[]>([]);
  const [gachaError, setGachaError] = useState<string | null>(null);
  /** serverTime ≈ Date.now() + clockOffset */
  const [clockOffset, setClockOffset] = useState(0);
  const getOptionsRef = useRef(getOptions);
  getOptionsRef.current = getOptions;

  useEffect(() => {
    let cancelled = false;
    // Start clean: this effect also re-runs when Next re-shows a preserved (hidden) room page
    setChat([]);
    setBubbles({});
    setSpins([]);
    setReactions([]);
    let joined: StudyRoom | null = null;
    const client = new Client(GAME_URL);
    setStatus('connecting');
    setError(null);

    (async () => {
      try {
        const opts = getOptionsRef.current();
        const r = (roomId ? await client.joinById(roomId, opts) : await client.joinOrCreate(ROOM_NAME, opts)) as StudyRoom;
        if (cancelled) {
          r.leave();
          return;
        }
        joined = r;
        const callbacks = Callbacks.get(r as any) as any;
        // State arrives just after the join resolves, so guard until the first patch lands.
        const syncIds = () => setPlayerIds(r.state?.players ? [...r.state.players.keys()] : []);
        const syncNpcs = () => setNpcIds(r.state?.npcs ? [...r.state.npcs.keys()] : []);
        r.onStateChange.once(() => {
          syncIds();
          syncNpcs();
        });
        callbacks.onAdd('players', syncIds);
        callbacks.onRemove('players', syncIds);
        callbacks.onAdd('npcs', syncNpcs);
        callbacks.onRemove('npcs', syncNpcs);
        r.onMessage('npc:say', (m: { npcId: string; text: string }) =>
          setBubbles((b) => ({ ...b, [npcKey(m.npcId)]: { text: m.text, until: Date.now() + BUBBLE_MS } })),
        );
        r.onMessage('npc:react', (m: { npcId: string; emote: string }) => {
          const key = `${m.npcId}-${Date.now()}-${Math.random()}`;
          setReactions((list) => [...list.slice(-20), { key, target: npcKey(m.npcId), emote: m.emote }]);
          setTimeout(() => setReactions((list) => list.filter((x) => x.key !== key)), 1700);
        });
        r.onMessage('gacha:spun', (m: GachaSpun) => setSpins((list) => [...list.slice(-10), { ...m, at: Date.now() }]));
        r.onMessage('gacha:error', (m: { message: string }) => {
          setGachaError(m.message);
          setTimeout(() => setGachaError(null), 3500);
        });
        r.onMessage('chat', (m: ChatMessage) => {
          setChat((log) => [...log.slice(-99), m]);
          if (!m.system) setBubbles((b) => ({ ...b, [m.sessionId]: { text: m.text, until: Date.now() + BUBBLE_MS } }));
        });
        // Clock sync: assume the reply was stamped halfway through the round trip
        const sentAt = Date.now();
        r.onMessage('clock', (m: { serverNow: number }) => setClockOffset(m.serverNow - (sentAt + Date.now()) / 2));
        r.send('clock', {});
        r.onLeave(() => setStatus('closed'));
        r.onError((_code: number, message?: string) => {
          setError(message ?? 'Connection error');
          setStatus('error');
        });
        syncIds();
        setRoom(r);
        setStatus('connected');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      joined?.leave();
      setRoom(null);
      setPlayerIds([]);
      setNpcIds([]);
    };
    // Re-join only when the target room changes.
  }, [roomId]);

  // Drop expired speech bubbles so they disappear on time
  useEffect(() => {
    const timer = setInterval(() => {
      setBubbles((b) => {
        const now = Date.now();
        const live = Object.entries(b).filter(([, v]) => v.until > now);
        return live.length === Object.keys(b).length ? b : Object.fromEntries(live);
      });
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return { room, status, error, playerIds, npcIds, chat, bubbles, reactions, spins, gachaError, clockOffset };
}
