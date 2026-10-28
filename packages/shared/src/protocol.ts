import type { AvatarLook } from './avatar';

export const STATUSES = ['idle', 'focus', 'break', 'away'] as const;
export type PlayerStatus = (typeof STATUSES)[number];

/** Options a client passes to joinOrCreate. */
export interface JoinOptions {
  name: string;
  look: AvatarLook;
}

/** Client → server messages. */
export interface ClientMessages {
  move: { x: number; z: number; yaw: number; moving: boolean };
  sit: { seatId: string };
  stand: Record<string, never>;
  chat: { text: string };
}

/** Server → client broadcast messages (not part of synced state). */
export interface ServerMessages {
  chat: ChatMessage;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  name: string;
  text: string;
  at: number;
}

/** Shape of one player in the synced room state, as the client sees it. */
export interface PlayerView {
  name: string;
  look: string; // JSON-encoded AvatarLook
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  seatId: string;
  status: PlayerStatus;
}

/** Row returned by the lobby endpoint. */
export interface RoomListing {
  roomId: string;
  label: string;
  clients: number;
  maxClients: number;
}
