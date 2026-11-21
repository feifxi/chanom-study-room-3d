/**
 * One person in a 3D room, as clients see them. A placeholder carried over so the 3D scene compiles:
 * the real game protocol is designed with the game server (port step 4) and will replace it.
 */

export const PLAYER_STATUSES = ['idle', 'focus', 'break', 'away'] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export interface PlayerView {
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
  /** seq of the last move the server applied, for reconciling the client's prediction. */
  moveSeq: number;
}
