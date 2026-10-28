import type { AvatarLook } from './avatar';
import type { TimerPhase } from './focus';

export const STATUSES = ['idle', 'focus', 'break', 'away'] as const;
export type PlayerStatus = (typeof STATUSES)[number];

/** Options a client passes to joinOrCreate. */
export interface JoinOptions {
  name: string;
  look: AvatarLook;
  /** Anonymous id kept in the browser; groups study stats across visits. */
  visitorId: string;
}

/** Client → server messages. */
export interface ClientMessages {
  move: { x: number; z: number; yaw: number; moving: boolean };
  sit: { seatId: string };
  stand: Record<string, never>;
  chat: { text: string };
  /** Sent when the chat box gains/loses unsent text, and every few seconds while typing. */
  typing: { on: boolean };
  /** What you're studying, shown with the focus icon. */
  subject: { text: string };
  away: { on: boolean };
  /** Report your pomodoro phase; the room shows it above your head. */
  'timer:personal': { phase: TimerPhase; endsAt: number };
  /** Ask for the server time (answered with a `clock` message). */
  clock: Record<string, never>;
  /** Ask for a LiveKit token for this room (answered with `voice:token`). */
  'voice:token': Record<string, never>;
}

/** Server → client broadcast messages (not part of synced state). */
export interface ServerMessages {
  chat: ChatMessage;
  /** Reply to `clock`, used to line client clocks up with the server's. */
  clock: { serverNow: number };
  'voice:token': { url: string; token: string };
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
  /** Server epoch ms when the current focus/break ends (0 = no countdown). */
  statusEndsAt: number;
  subject: string;
  /** Server epoch ms when the current focus stretch began (0 = not focusing). */
  focusSince: number;
  todayMin: number;
  typing: boolean;
}

export interface VisitorStatsView {
  todayMin: number;
  weekMin: number;
  streakDays: number;
  last7: { date: string; minutes: number }[];
}

export interface LeaderRowView {
  name: string;
  minutes: number;
}

export interface StudyStateView {
  players: Map<string, PlayerView>;
}

/** Row returned by the lobby endpoint. */
export interface RoomListing {
  roomId: string;
  label: string;
  clients: number;
  maxClients: number;
}
