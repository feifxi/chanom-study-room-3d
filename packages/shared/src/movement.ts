/**
 * Movement rules both sides agree on: the client predicts with them and the game server enforces
 * them, so a change here changes both.
 */

/** How often the game server sends state patches (ms). */
export const PATCH_RATE_MS = 50;

/** How often a client sends its own position (Hz). */
export const CLIENT_SEND_HZ = 15;

/** Metres per second. */
export const WALK_SPEED = 3;
export const RUN_SPEED = 5.2;
/** Slack on top of RUN_SPEED before the server cuts a move short (timing noise, not teleports). */
export const SPEED_TOLERANCE = 1.6;

export const PLAYER_RADIUS = 0.3;
/** How close you need to be to a seat to sit down. */
export const SIT_REACH = 1.6;
