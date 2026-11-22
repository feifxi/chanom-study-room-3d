'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * The one live connection per tab (Socket.IO at /live on this site, so the session cookie goes
 * with it). Opened the first time something needs it; it reconnects by itself.
 */
export function liveSocket(): Socket {
  socket ??= io({ path: '/live', addTrailingSlash: false, withCredentials: true });
  return socket;
}

/** Signing out: the next account gets its own connection. */
export function closeLive() {
  socket?.close();
  socket = null;
}
