import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { browser, createTestApp, resetAccounts, signedUp, type MemoryStorage } from '../../test/test-app.js';
import { uploadKey } from '../chat/pictures.service.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;
let storage: MemoryStorage;

beforeAll(async () => {
  ({ app, sent, prisma, storage } = await createTestApp());
});
afterAll(() => app?.close());
beforeEach(async () => {
  await resetAccounts(prisma);
  storage.files.clear();
});

const person = (handle: string) => signedUp(app, sent, handle);
const photo = () =>
  sharp({ create: { width: 3000, height: 3000, channels: 3, background: '#e8772e' } })
    .jpeg()
    .toBuffer();

/** What the browser does: get an upload link, put the file, then hand it to the room. */
async function upload(b: Awaited<ReturnType<typeof person>>) {
  const body = await photo();
  const start = (await b.post('/api/pictures', { contentType: 'image/jpeg', bytes: body.length }).expect(201)).body;
  await storage.put(uploadKey(start.id), body, 'image/jpeg');
  return start.id as string;
}

describe('room thumbnails', () => {
  it('the owner sets one: cropped to 16:9, shown to anyone, replaced and cleared', async () => {
    const mai = await person('maimai');
    const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
    expect(room.thumbnail).toBeNull();

    const first = (await mai.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: await upload(mai) }).expect(200)).body.thumbnail;
    expect(first).toMatch(new RegExp(`^/api/rooms/${room.id}/thumbnail\\?v=`));
    expect((await mai.get(`/api/rooms/${room.id}`).expect(200)).body.thumbnail).toBe(first);
    // The original and its upload row are gone; only the WebP stays
    const keys = [...storage.files.keys()];
    expect(keys).toHaveLength(1);
    const meta = await sharp(storage.files.get(keys[0]!)!.body).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 1280, height: 720 });
    expect(await prisma.picture.count()).toBe(0);

    // Signed out too: Discover and invite pages show it
    await browser(app).get(first).expect(302);

    const second = (await mai.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: await upload(mai) }).expect(200)).body.thumbnail;
    expect(second).not.toBe(first);
    expect(storage.files.size).toBe(1);

    await mai.delete(`/api/rooms/${room.id}/thumbnail`).expect(204);
    expect((await mai.get(`/api/rooms/${room.id}`).expect(200)).body.thumbnail).toBeNull();
    expect(storage.files.size).toBe(0);
    await browser(app).get(`/api/rooms/${room.id}/thumbnail`).expect(404);
  });

  it('is the owner’s alone, and an upload is used once', async () => {
    const mai = await person('maimai');
    const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
    const jod = await person('jod');
    const { code } = (await mai.post(`/api/rooms/${room.id}/invites`, { kind: 'member' }).expect(200)).body;
    await jod.post(`/api/invites/${code}/accept`).expect(200);
    await jod.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: await upload(jod) }).expect(403);

    // Someone else's upload, or one already used, doesn't work
    const jods = await upload(jod);
    await mai.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: jods }).expect(404);
    const mine = await upload(mai);
    await mai.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: mine }).expect(200);
    await mai.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: mine }).expect(404);
  });

  it('turns down what isn’t a picture, and leaves storage with a deleted room', async () => {
    const mai = await person('maimai');
    const room = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
    const start = (await mai.post('/api/pictures', { contentType: 'image/png', bytes: 10 }).expect(201)).body;
    await storage.put(uploadKey(start.id), Buffer.from('not a png'), 'image/png');
    await mai.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: start.id }).expect(400);
    expect(storage.files.size).toBe(0);

    await mai.put(`/api/rooms/${room.id}/thumbnail`, { pictureId: await upload(mai) }).expect(200);
    await mai.delete(`/api/rooms/${room.id}`, { name: 'Chanom Friends' }).expect(204);
    expect(storage.files.size).toBe(0);
  });
});
