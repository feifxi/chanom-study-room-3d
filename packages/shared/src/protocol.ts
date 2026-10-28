import type { AvatarLook } from './avatar';
import type { RoomTimerView, TimerMode, TimerPhase } from './focus';

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
  /** Choose which timer drives your status. */
  'timer:mode': { mode: TimerMode };
  /** Report your personal pomodoro phase (mode must be 'personal'). */
  'timer:personal': { phase: TimerPhase; endsAt: number };
  /** Start the shared room timer (anyone can; you start following it). */
  'timer:start': { focusMin: number; breakMin: number };
  'timer:stop': Record<string, never>;
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
  /** The shared room timer moved to a new phase. */
  chime: { phase: TimerPhase };
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
  timerMode: TimerMode;
  typing: boolean;
}

export interface StudyStateView {
  players: Map<string, PlayerView>;
  timer: RoomTimerView;
}

/** Row returned by the lobby endpoint. */
export interface RoomListing {
  roomId: string;
  label: string;
  clients: number;
  maxClients: number;
}
