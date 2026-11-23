import type { NpcKind, NpcSummoned, Point } from '@connecta/shared';
import type { MapData } from '@connecta/shared/maps';
import type { Npc, RoomState } from '../state.js';

/** What the NPC code needs from its room. */
export interface NpcHost {
  state: RoomState;
  /** The room's map now (an owner can switch it live) */
  map: MapData;
  /** A bubble over an NPC */
  say(npcId: string, text: string): void;
  /** A floating emote over an NPC (hearts when petted) */
  react(npcId: string, emote: string): void;
  /** A line in everyone's Bubbles log ("Mai summoned a calico cat, Nori!") */
  note(text: string): void;
  /** Someone pulled the Buddy Machine's knob: every machine in the room plays the capsule */
  summoned(event: NpcSummoned): void;
}

/** Server-only behaviour state for one NPC (never synced). */
export interface Brain {
  kind: NpcKind;
  state: 'idle' | 'walk' | 'nap' | 'follow' | 'toSeat' | 'seated' | 'stretch' | 'leaving';
  path: Point[];
  until: number;
  /** What to do on arrival */
  arrive?: () => void;
  stuckFor: number;
  repaths: number;
  /** When a following cat last re-planned its path */
  replannedAt: number;
  // Study buddies only
  phase: 'focus' | 'break';
  phaseEndsAt: number;
  cheerAt: number;
  greetAt: number;
}

export interface NpcContext {
  host: NpcHost;
  brains: Map<string, Brain>;
}

/** One NPC, as the behaviour functions get it */
export interface Agent {
  id: string;
  npc: Npc;
  brain: Brain;
}

export const MINUTE = 60_000;
/** Metres per second: cats amble, hurry when following you, study buddies walk like people do */
export const SPEED = { cat: 0.9, catFollow: 2.1, buddy: 1.9 } as const;

export const rand = Math.random;
export const between = (a: number, b: number) => a + rand() * (b - a);
