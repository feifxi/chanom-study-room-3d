import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DECK_PASS_AUDIENCE } from '@connecta/shared/pick-a-side';
import { browser, createTestApp, LOOK, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
});
afterAll(async () => {
  await app?.close();
});
beforeEach(async () => {
  await resetAccounts(prisma);
});

const person = (handle: string) => signedUp(app, sent, handle) as Promise<Browser & { id: string }>;

const WYR = {
  name: 'Our group',
  kind: 'opinion',
  questions: [
    { q: 'Beach or mountains?', answers: ['Beach', 'Mountains'] },
    { q: 'Tea or coffee?', answers: ['Tea', 'Coffee'] },
    { q: 'Cats or dogs?', answers: ['Cats', 'Dogs'] },
  ],
};

/** Mai's room with Jod as a member and Mint as a guest */
async function room() {
  const mai = await person('maimai');
  const jod = await person('jod');
  const { id } = (await mai.post('/api/rooms', { name: 'Chanom Friends', mapId: 'library' }).expect(201)).body;
  const invite = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'member' }).expect(200)).body;
  await jod.post(`/api/invites/${invite.code}/accept`).expect(200);
  const pass = (await mai.post(`/api/rooms/${id}/invites`, { kind: 'guest' }).expect(200)).body;
  const mint = browser(app);
  await mint.post('/api/auth/sign-in/anonymous').expect(200);
  await mint.put('/api/me/guest', { name: 'Mint', look: LOOK, over13: true }).expect(200);
  await mint.post(`/api/invites/${pass.code}/accept`).expect(200);
  return { mai, jod, mint, id };
}

describe('room decks', () => {
  it('members write decks for the room; everyone let in sees them; others get a 404', async () => {
    const { mai, jod, mint, id } = await room();
    const deck = (await jod.post(`/api/rooms/${id}/decks`, WYR).expect(201)).body;
    expect(deck).toMatchObject({ name: 'Our group', kind: 'opinion', mine: true, canDelete: true, by: { handle: 'jod' } });
    expect(deck.questions[0]).toEqual({ id: `${deck.id}-0`, q: 'Beach or mountains?', answers: ['Beach', 'Mountains'] });
    expect((await mai.get(`/api/rooms/${id}/decks`).expect(200)).body[0]).toMatchObject({ id: deck.id, mine: false, canDelete: true });
    expect((await mint.get(`/api/rooms/${id}/decks`).expect(200)).body[0]).toMatchObject({ mine: false, canDelete: false });
    await mint.post(`/api/rooms/${id}/decks`, WYR).expect(403);
    const ploy = await person('ploy');
    await ploy.get(`/api/rooms/${id}/decks`).expect(404);
    await ploy.post(`/api/decks/${deck.id}/pass`).expect(404);
  });

  it('masks rude words like the chat does', async () => {
    const { jod, id } = await room();
    const rude = {
      ...WYR,
      questions: [{ q: 'What the fuck: tea or coffee?', answers: ['Tea', 'sh1t coffee'] }, ...WYR.questions.slice(1)],
    };
    const deck = (await jod.post(`/api/rooms/${id}/decks`, rude).expect(201)).body;
    expect(deck.questions[0]).toMatchObject({ q: 'What the ****: tea or coffee?', answers: ['Tea', '**** coffee'] });
  });

  it('checks the questions: 2 answers for Would you rather, 4 with one right for a quiz, 3 at least', async () => {
    const { mai, id } = await room();
    await mai.post(`/api/rooms/${id}/decks`, { ...WYR, questions: WYR.questions.slice(0, 2) }).expect(400);
    await mai.post(`/api/rooms/${id}/decks`, { ...WYR, kind: 'quiz' }).expect(400);
    const quiz = { q: 'Capital of Thailand?', answers: ['Bangkok', 'Phuket', 'Pattaya', 'Chiang Mai'], right: 0 };
    await mai
      .post(`/api/rooms/${id}/decks`, { name: 'Geo', kind: 'quiz', questions: [quiz, quiz, { ...quiz, right: undefined }] })
      .expect(400);
    const ok = (await mai.post(`/api/rooms/${id}/decks`, { name: 'Geo', kind: 'quiz', questions: [quiz, quiz, quiz] }).expect(201)).body;
    expect(ok.questions[2].right).toBe(0);
  });

  it('only the writer changes a deck; the writer, owner or a mod deletes it', async () => {
    const { mai, jod, id } = await room();
    const mine = (await mai.post(`/api/rooms/${id}/decks`, WYR).expect(201)).body;
    await jod.patch(`/api/decks/${mine.id}`, { ...WYR, name: 'Hijacked' }).expect(403);
    await jod.delete(`/api/decks/${mine.id}`).expect(403);
    expect((await mai.patch(`/api/decks/${mine.id}`, { ...WYR, name: 'Renamed' }).expect(200)).body.name).toBe('Renamed');
    const jods = (await jod.post(`/api/rooms/${id}/decks`, WYR).expect(201)).body;
    await mai.delete(`/api/decks/${jods.id}`).expect(204);
    await mai.delete(`/api/decks/${mine.id}`).expect(204);
    expect((await mai.get(`/api/rooms/${id}/decks`).expect(200)).body).toEqual([]);
  });

  it('signs a pass for the room’s game server, for anyone let in (guests host too)', async () => {
    const { jod, mint, id } = await room();
    const deck = (await jod.post(`/api/rooms/${id}/decks`, WYR).expect(201)).body;
    const { pass } = (await mint.post(`/api/decks/${deck.id}/pass`).expect(201)).body;
    const secret = new TextEncoder().encode(app.get(ConfigService).get<string>('GAME_SECRET'));
    const { payload } = await jwtVerify(pass, secret, { audience: DECK_PASS_AUDIENCE });
    expect(payload).toMatchObject({ roomId: id, deck: { id: deck.id, kind: 'opinion', source: 'room', name: 'Our group' } });
  });
});
