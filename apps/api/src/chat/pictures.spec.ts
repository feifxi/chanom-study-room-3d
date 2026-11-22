import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  createTestGateway,
  nextEvent,
  resetAccounts,
  signedUp,
  type Browser,
  type MemoryStorage,
} from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PICTURES_QUEUE, PicturesService, uploadKey } from './pictures.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
let storage: MemoryStorage;

beforeAll(async () => {
  ({ app, sent, prisma, storage } = await createTestApp());
});
afterAll(() => app?.close());
beforeEach(async () => {
  // The worker may still be busy with the last test's pictures
  await processed();
  await resetAccounts(prisma);
  storage.files.clear();
});

const person = (handle: string) => signedUp(app, sent, handle);
/** A big photo, as a phone would send it */
const photo = () =>
  sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#e8772e' } })
    .jpeg()
    .toBuffer();

/** What the browser does: get a link, put the file (straight into storage), say it's done. */
async function upload(b: Browser, file?: Buffer) {
  const body = file ?? (await photo());
  const start = (await b.post('/api/pictures', { contentType: 'image/jpeg', bytes: body.length }).expect(201)).body;
  await storage.put(uploadKey(start.id), body, 'image/jpeg');
  await b.post(`/api/pictures/${start.id}/uploaded`).expect(204);
  return start as { id: string; uploadUrl: string };
}

/** Until the worker has finished with these pictures (or with every picture) */
async function processed(ids?: string[]) {
  for (let i = 0; i < 100; i++) {
    const left = await prisma.picture.count({ where: { ...(ids && { id: { in: ids } }), status: 'processing' } });
    if (!left) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('pictures never processed');
}

async function room() {
  const mai = await person('maimai');
  const jod = await person('jod');
  const id = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body.id as string;
  const { code } = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
  await jod.post(`/api/invites/${code}/accept`).expect(200);
  return { mai, jod, id };
}

describe('pictures in chat', () => {
  it('hands out an upload link for pictures up to 10 MB only', async () => {
    const mai = await person('maimai');
    await mai.post('/api/pictures', { contentType: 'image/png', bytes: 11 * 1024 * 1024 }).expect(400);
    await mai.post('/api/pictures', { contentType: 'text/html', bytes: 100 }).expect(400);
    const start = (await mai.post('/api/pictures', { contentType: 'image/png', bytes: 100 }).expect(201)).body;
    expect(start.uploadUrl).toBe(`memory://put/${uploadKey(start.id)}`);
    expect(start.headers).toEqual({ 'Content-Type': 'image/png' });
  });

  it('the worker shrinks an upload to a WebP no longer than 2048 px and drops the original', async () => {
    const mai = await person('maimai');
    const { id } = await upload(mai);
    await processed([id]);
    const picture = await prisma.picture.findUniqueOrThrow({ where: { id } });
    expect(picture).toMatchObject({ status: 'ready', width: 2048, height: 1536, key: `pictures/${id}.webp` });
    expect(storage.files.has(uploadKey(id))).toBe(false);
    expect((await sharp(storage.files.get(picture.key!)!.body).metadata()).format).toBe('webp');
  });

  it('the message waits for its pictures, then shows to the room live', async () => {
    const { mai, jod, id } = await room();
    const { gateway, connect } = await createTestGateway();
    const jodLive = await connect(jod);
    await jodLive.emitWithAck('watch', id);
    try {
      const a = await upload(mai);
      const b = await upload(mai);
      const arriving = nextEvent<{ id: string; ready: boolean; pictures: { ready: boolean }[] }>(jodLive, 'message');
      const msg = (await mai.post(`/api/rooms/${id}/messages`, { text: '', pictureIds: [b.id, a.id] }).expect(201)).body;
      expect(msg.pictures.map((p: { id: string }) => p.id)).toEqual([b.id, a.id]);

      const live = await arriving;
      expect(live).toMatchObject({ id: msg.id, ready: true });
      expect(live.pictures.every((p) => p.ready)).toBe(true);
      const page = (await jod.get(`/api/rooms/${id}/messages`).expect(200)).body;
      expect(page.messages.map((m: { id: string }) => m.id)).toEqual([msg.id]);
    } finally {
      jodLive.close();
      await gateway.close();
    }
  });

  it('only the room’s members get a link to open a picture', async () => {
    const { mai, jod, id } = await room();
    const p = await upload(mai);
    await processed([p.id]);
    // Before it's sent, only the uploader can open it
    await jod.get(`/api/pictures/${p.id}`).expect(404);
    await mai.post(`/api/rooms/${id}/messages`, { text: 'look', pictureIds: [p.id] }).expect(201);
    const res = await jod.get(`/api/pictures/${p.id}`).expect(302);
    expect(res.headers.location).toBe(`memory://get/pictures/${p.id}.webp`);
    await (await person('ployy')).get(`/api/pictures/${p.id}`).expect(404);
  });

  it('can’t attach someone else’s upload, one not uploaded yet, or more than four', async () => {
    const { mai, jod, id } = await room();
    const hers = await upload(mai);
    await jod.post(`/api/rooms/${id}/messages`, { text: 'mine now', pictureIds: [hers.id] }).expect(400);
    const unfinished = (await mai.post('/api/pictures', { contentType: 'image/png', bytes: 100 }).expect(201)).body;
    await mai.post(`/api/rooms/${id}/messages`, { text: '', pictureIds: [unfinished.id] }).expect(400);
    const five = await Promise.all(Array.from({ length: 5 }, () => upload(mai)));
    await mai.post(`/api/rooms/${id}/messages`, { text: '', pictureIds: five.map((p) => p.id) }).expect(400);
  });

  it('a file that isn’t a picture is dropped, and a message with nothing else goes too', async () => {
    const { mai, id } = await room();
    const queue = app.get<Queue>(getQueueToken(PICTURES_QUEUE));
    // Sent before the worker gets to it
    await queue.pause();
    let bad: { id: string };
    let msg: { id: string; ready: boolean };
    try {
      bad = await upload(mai, Buffer.from('not an image'));
      msg = (await mai.post(`/api/rooms/${id}/messages`, { text: '', pictureIds: [bad.id] }).expect(201)).body;
    } finally {
      await queue.resume();
    }
    expect(msg.ready).toBe(false);
    await processed([bad.id]);
    await expect.poll(() => prisma.message.count({ where: { id: msg.id } })).toBe(0);
    expect([...storage.files.keys()]).toEqual([]);

    // Refused before it was sent: it needs uploading again
    const late = await upload(mai, Buffer.from('still not an image'));
    await processed([late.id]);
    await mai.post(`/api/rooms/${id}/messages`, { text: 'hi', pictureIds: [late.id] }).expect(400);
  });

  it('deleting the message deletes its pictures', async () => {
    const { mai, jod, id } = await room();
    const p = await upload(mai);
    await processed([p.id]);
    const msg = (await mai.post(`/api/rooms/${id}/messages`, { text: 'look', pictureIds: [p.id] }).expect(201)).body;
    await mai.delete(`/api/messages/${msg.id}`).expect(204);
    expect(storage.files.size).toBe(0);
    await jod.get(`/api/pictures/${p.id}`).expect(404);
  });

  it('clears uploads that were never sent after a day', async () => {
    const mai = await person('maimai');
    const p = await upload(mai);
    await processed([p.id]);
    const later = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(await app.get(PicturesService).purgeUnsent(later)).toBe(1);
    expect(storage.files.size).toBe(0);
  });
});
