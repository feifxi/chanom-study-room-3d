import type { NpcKind, NpcSummoned, Point } from '@study/shared';
import type { Npc, StudyState } from '../state';

/** What the NPC code needs from its room. */
export interface NpcHost {
  state: StudyState;
  /** A speech bubble above an NPC. */
  say(npcId: string, text: string): void;
  /** A floating emote (e.g. hearts when petted). */
  react(npcId: string, emote: string): void;
  /** A system line in the room chat. */
  announce(text: string): void;
  summoned(event: NpcSummoned): void;
}

/** Server-only behaviour state for one NPC (never synced to clients). */
export interface Brain {
  kind: NpcKind;
  state: 'idle' | 'walk' | 'nap' | 'follow' | 'toSeat' | 'seated' | 'stretch' | 'leaving';
  path: Point[];
  until: number;
  /** What to do on arrival. */
  arrive?: () => void;
  stuckFor: number;
  repaths: number;
  // Study buddy only
  phase: 'focus' | 'break';
  phaseEndsAt: number;
  cheerAt: number;
  greetAt: number;
}

/** Everything a behaviour function may touch. */
export interface NpcContext {
  host: NpcHost;
  brains: Map<string, Brain>;
}

/** One NPC, as behaviour functions receive it. */
export interface Agent {
  id: string;
  npc: Npc;
  brain: Brain;
}

export const MINUTE = 60_000;
export const SPEED = { cat: 0.9, catFollow: 2.1, buddy: 1.9 } as const;

export const rand = Math.random;
export const between = (a: number, b: number) => a + rand() * (b - a);
