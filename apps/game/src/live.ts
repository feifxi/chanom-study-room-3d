import { matchMaker } from 'colyseus';
import { ROOM_NAME, type AdminLive } from '@study/shared';
import type { StudyRoomMetadata } from './rooms/StudyRoom';
import { presence } from './presence';

/** Every open room with its head count and NPCs, for the lobby and the admin page. */
async function openRooms() {
  const listings = await matchMaker.query({ name: ROOM_NAME });
  return listings.sort((a, b) => label(a.metadata).localeCompare(label(b.metadata), undefined, { numeric: true }));
}

const label = (metadata: unknown) => (metadata as StudyRoomMetadata | undefined)?.label ?? 'Library';

export async function roomListing() {
  return (await openRooms()).map((r) => ({ roomId: r.roomId, label: label(r.metadata), clients: r.clients, maxClients: r.maxClients }));
}

/** GET /internal/live: only the API calls it, over the compose network (Caddy answers 404 publicly). */
export async function liveData(): Promise<AdminLive> {
  const rooms = (await openRooms()).map((r) => {
    const local = matchMaker.getLocalRoomById(r.roomId) as { state?: { npcs?: Map<string, unknown> } } | undefined;
    return { label: label(r.metadata), clients: r.clients, maxClients: r.maxClients, npcs: local?.state?.npcs?.size ?? 0 };
  });
  return { online: presence.online, peakOnline: presence.peak, rooms };
}
