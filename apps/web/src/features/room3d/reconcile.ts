/**
 * Client-side prediction with server reconciliation (the usual multiplayer approach).
 *
 * Each move we send carries a sequence number, and we remember where we predicted we'd be. The
 * server echoes the last seq it applied. Comparing its position with our prediction *for that
 * same move* (not with where we are now, which is always ahead by the round trip) tells us whether
 * the server actually changed anything. Only then do we correct, and smoothly. Before this, on a
 * slow connection the plain "server is far from me" check kept pulling people back.
 */
export interface SentMove {
  seq: number;
  x: number;
  z: number;
}

/** Below this the server agrees with us (float noise, tiny clamps). Metres. */
export const RECONCILE_EPSILON = 0.05;
/** Moves we remember at most (about 6 s at 15 Hz); anything older can't be acknowledged anymore. */
const HISTORY_MAX = 90;

export function recordMove(history: SentMove[], move: SentMove) {
  history.push(move);
  if (history.length > HISTORY_MAX) history.shift();
}

/**
 * Apply the server's acknowledgement. Returns how far the server moved us away from our prediction
 * for that move (to blend in), or null when there's nothing new or nothing to fix. Later predictions
 * in the history are shifted by the same amount, since they were built on the uncorrected position.
 */
export function reconcile(history: SentMove[], ackSeq: number, server: { x: number; z: number }) {
  while (history.length && history[0]!.seq < ackSeq) history.shift();
  const acked = history[0];
  if (!acked || acked.seq !== ackSeq) return null;
  history.shift();
  const dx = server.x - acked.x;
  const dz = server.z - acked.z;
  if (Math.hypot(dx, dz) < RECONCILE_EPSILON) return null;
  for (const h of history) {
    h.x += dx;
    h.z += dz;
  }
  return { dx, dz };
}
