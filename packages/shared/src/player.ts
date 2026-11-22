/** One person in a 3D room, as clients see them (the game server's state, `apps/game`). */

export const PLAYER_STATUSES = ['idle', 'focus', 'break', 'away'] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

/** Your place in the room you walked into; guests came with a guest pass. */
export type PlayerRole = 'owner' | 'mod' | 'member' | 'guest';

export interface PlayerView {
  /** Their account, for the people list (profile, add friend); '' for the demo's scripted people */
  userId: string;
  /** For Message and Add friend in the people list; '' for guests */
  handle: string;
  role: PlayerRole;
  name: string;
  /** JSON-encoded AvatarLook. */
  look: string;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  seatId: string;
  status: PlayerStatus;
  /** Server epoch ms when the current focus or break ends (0 = no countdown). */
  statusEndsAt: number;
  subject: string;
  /** Server epoch ms when the current focus stretch began (0 = not focusing). */
  focusSince: number;
  todayMin: number;
  typing: boolean;
  /** Talk to everyone (owner and mods): heard everywhere, and bubbles reach private zones */
  stage: boolean;
  /** Can't use voice right now: a guest in a room without guest voice, muted for everyone, or timed out */
  hushed: boolean;
  /** Muted for everyone by the owner or a mod (until they lift it or the room empties) */
  mutedByMod: boolean;
  /** Deafened: hears nobody (their mic is off too) */
  deaf: boolean;
  /** seq of the last move the server applied, for reconciling the client's prediction. */
  moveSeq: number;
}
