import type { NpcSummoned, NpcView, PlayerView } from '@study/shared';

/**
 * Demo stand-in for V1's roomSession.ts. The 3D files are copied from apps/web unchanged; they only
 * need these types. `StudyRoom` is the small slice of a Colyseus room they actually use, so a local
 * mock (mockRoom.ts) can play the server.
 */
export interface StudyRoom {
  sessionId: string;
  state: { players: Map<string, PlayerView>; npcs: Map<string, NpcView> };
  send(type: string, payload: unknown): void;
}

export const BUBBLE_MS = 4500;

export interface Bubble {
  text: string;
  until: number;
}

export interface Reaction {
  key: string;
  target: string;
  emote: string;
}

export type Summon = NpcSummoned & { at: number };

export const npcKey = (id: string) => `npc:${id}`;
