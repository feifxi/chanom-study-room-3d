/** Colyseus room name every public study room is registered under. */
export const ROOM_NAME = 'study';

/** A public room locks at this many people; the next visitor gets a fresh room. */
export const MAX_PLAYERS = 20;

/** How often the server sends state patches (ms). */
export const PATCH_RATE_MS = 50;

/** How often a client sends its own position (Hz). */
export const CLIENT_SEND_HZ = 15;

export const WALK_SPEED = 3;
export const RUN_SPEED = 5.2;
/** Slack allowed on top of RUN_SPEED before the server rejects a move as a teleport. */
export const SPEED_TOLERANCE = 1.6;

export const PLAYER_RADIUS = 0.3;
export const SIT_REACH = 1.6;

export const NAME_MAX = 16;
export const CHAT_MAX = 200;
export const SUBJECT_MAX = 24;
