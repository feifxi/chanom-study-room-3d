import type { Room } from '@colyseus/sdk';
import type { ChatMessage, NpcSummoned, StudyStateView } from '@study/shared';

export type StudyRoom = Room<unknown, StudyStateView>;
export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'closed';

export const BUBBLE_MS = 4500;
export const REACTION_MS = 1700;
const CHAT_HISTORY = 100;
const SUMMON_HISTORY = 10;
const REACTION_LIMIT = 20;

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

/** A summon as this client saw it: `at` is when the capsule animation started (local time). */
export type Summon = NpcSummoned & { at: number };

/** NPC labels and bubbles share the player label board, keyed like this. */
export const npcKey = (id: string) => `npc:${id}`;

/** Everything React renders about the room connection. Positions are read from `room.state` per frame instead. */
export interface SessionState {
  room: StudyRoom | null;
  status: ConnectionStatus;
  error: string | null;
  playerIds: string[];
  npcIds: string[];
  chat: ChatMessage[];
  bubbles: Record<string, Bubble>;
  reactions: Reaction[];
  /** Recent Buddy Machine summons (the latest drives the machine animation). */
  summons: Summon[];
  summonError: string | null;
  /** serverTime ≈ Date.now() + clockOffset */
  clockOffset: number;
}

export const initialSession: SessionState = {
  room: null,
  status: 'connecting',
  error: null,
  playerIds: [],
  npcIds: [],
  chat: [],
  bubbles: {},
  reactions: [],
  summons: [],
  summonError: null,
  clockOffset: 0,
};

export type SessionAction =
  | { type: 'reset' }
  | { type: 'joined'; room: StudyRoom }
  | { type: 'failed'; error: string }
  | { type: 'closed' }
  | { type: 'players'; ids: string[] }
  | { type: 'npcs'; ids: string[] }
  | { type: 'chat'; message: ChatMessage; now: number }
  | { type: 'npcSay'; npcId: string; text: string; now: number }
  | { type: 'react'; key: string; npcId: string; emote: string }
  | { type: 'reactionDone'; key: string }
  | { type: 'summoned'; summon: NpcSummoned; now: number }
  | { type: 'summonError'; message: string | null }
  | { type: 'clock'; offset: number }
  | { type: 'expireBubbles'; now: number };

const say = (bubbles: Record<string, Bubble>, key: string, text: string, now: number) => ({
  ...bubbles,
  [key]: { text, until: now + BUBBLE_MS },
});

/** Pure: every state change of a room session. Time comes in on the action, so this stays deterministic. */
export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case 'reset':
      return initialSession;
    case 'joined':
      return { ...s, room: a.room, status: 'connected', error: null };
    case 'failed':
      return { ...s, status: 'error', error: a.error };
    case 'closed':
      return { ...s, status: 'closed' };
    case 'players':
      return { ...s, playerIds: a.ids };
    case 'npcs':
      return { ...s, npcIds: a.ids };
    case 'chat':
      return {
        ...s,
        chat: [...s.chat.slice(-(CHAT_HISTORY - 1)), a.message],
        // System lines (joins, Buddy Machine news) only go in the chat log
        bubbles: a.message.system ? s.bubbles : say(s.bubbles, a.message.sessionId, a.message.text, a.now),
      };
    case 'npcSay':
      return { ...s, bubbles: say(s.bubbles, npcKey(a.npcId), a.text, a.now) };
    case 'react':
      return { ...s, reactions: [...s.reactions.slice(-(REACTION_LIMIT - 1)), { key: a.key, target: npcKey(a.npcId), emote: a.emote }] };
    case 'reactionDone':
      return { ...s, reactions: s.reactions.filter((r) => r.key !== a.key) };
    case 'summoned':
      return { ...s, summons: [...s.summons.slice(-(SUMMON_HISTORY - 1)), { ...a.summon, at: a.now }] };
    case 'summonError':
      return { ...s, summonError: a.message };
    case 'clock':
      return { ...s, clockOffset: a.offset };
    case 'expireBubbles': {
      const live = Object.entries(s.bubbles).filter(([, b]) => b.until > a.now);
      return live.length === Object.keys(s.bubbles).length ? s : { ...s, bubbles: Object.fromEntries(live) };
    }
  }
}
