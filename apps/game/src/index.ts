import { defineRoom, defineServer, listen, matchMaker } from 'colyseus';
import { ROOM_NAME, type RoomListing } from '@study/shared';
import { StudyRoom, type StudyRoomMetadata } from './rooms/StudyRoom';

const PORT = Number(process.env.PORT ?? 2567);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

const server = defineServer({
  rooms: {
    // joinOrCreate fills the first open room; once it hits maxClients it locks
    // and the matchmaker opens a new one automatically.
    [ROOM_NAME]: defineRoom(StudyRoom),
  },
  express: (app) => {
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
      next();
    });

    app.get('/health', (_req, res) => {
      res.json({ ok: true });
    });

    // Public room list for the lobby.
    app.get('/rooms', async (_req, res) => {
      const rooms = await matchMaker.query({ name: ROOM_NAME });
      const listing: RoomListing[] = rooms
        .map((r) => ({
          roomId: r.roomId,
          label: (r.metadata as StudyRoomMetadata | undefined)?.label ?? 'Library',
          clients: r.clients,
          maxClients: r.maxClients,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      res.json(listing);
    });
  },
});

await listen(server, PORT);
