import { WebSocketTransport, defineRoom, defineServer } from 'colyseus';
import { GAME_ROOM } from '@connecta/shared';
import { ConnectaRoom, secrets } from './room.js';

/** The Colyseus server (rooms only; the entry point listens and wires Redis). */
export function gameServer(secret: string) {
  secrets.ticket = secret;
  return defineServer({
    // Explicit, so a bundle includes it (Colyseus would otherwise load it with a dynamic import)
    transport: new WebSocketTransport(),
    rooms: {
      // One Colyseus room per Connecta room: joinOrCreate with the same place lands in the same one
      [GAME_ROOM]: defineRoom(ConnectaRoom).filterBy(['place']),
    },
    express: (app) => {
      app.get('/health', (_req, res) => {
        res.json({ ok: true });
      });
    },
  });
}
