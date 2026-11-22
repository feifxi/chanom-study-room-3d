import type { NpcSummoned, NpcView, PlayerView } from '@connecta/shared';

/**
 * The connection types the 3D files need. `StudyRoom` is the small slice of a Colyseus room they
 * actually use, so a local mock (mockRoom.ts) can play the game server.
 */
export interface StudyRoom {
  sessionId: string;
  state: { players: Map<string, PlayerView>; npcs: Map<string, NpcView> };
  send(type: string, payload: unknown): void;
}

export const BUBBLE_MS = 4500;
/** Bubbles are short, out-loud lines: up to 120 characters (the game server enforces it). */
export { BUBBLE_MAX } from '@connecta/shared';
/** How long a bubble stays over your head: about 6 s, a little longer for long lines (max 10 s). */
export const bubbleMs = (text: string) => Math.min(10_000, 6000 + Math.max(0, text.length - 40) * 50);

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
