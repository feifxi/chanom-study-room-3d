import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TODO_LIMIT } from '@connecta/shared';
import { browser, createTestApp, LOOK, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { TodosService } from './todos.service.js';

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
const texts = async (b: Browser) =>
  (await b.get('/api/todos').expect(200)).body.todos.map((t: { text: string; done: boolean }) => [t.text, t.done]);

describe('the to-do list', () => {
  it('adds in order, ticks, unticks, deletes and clears done', async () => {
    const mai = await person('maimai');
    const read = (await mai.post('/api/todos', { text: '  Read chapter 7  ' }).expect(201)).body;
    expect(read).toMatchObject({ text: 'Read chapter 7', done: false });
    const calc = (await mai.post('/api/todos', { text: 'Calculus 1–10' }).expect(201)).body;
    await mai.post('/api/todos', { text: 'OS flashcards' }).expect(201);
    await mai.patch(`/api/todos/${read.id}`, { done: true }).expect(200);
    expect(await texts(mai)).toEqual([
      ['Read chapter 7', true],
      ['Calculus 1–10', false],
      ['OS flashcards', false],
    ]);
    await mai.patch(`/api/todos/${read.id}`, { done: false }).expect(200);
    await mai.patch(`/api/todos/${calc.id}`, { done: true }).expect(200);
    await mai.delete('/api/todos/done').expect(204);
    await mai.delete(`/api/todos/${read.id}`).expect(204);
    expect(await texts(mai)).toEqual([['OS flashcards', false]]);
  });

  it('is private: someone else’s items are not found', async () => {
    const mai = await person('maimai');
    const jod = await person('jod');
    const item = (await mai.post('/api/todos', { text: 'Secret plan' }).expect(201)).body;
    expect(await texts(jod)).toEqual([]);
    await jod.patch(`/api/todos/${item.id}`, { done: true }).expect(404);
    await jod.delete(`/api/todos/${item.id}`).expect(404);
    await jod.delete('/api/todos/done').expect(204);
    expect(await texts(mai)).toEqual([['Secret plan', false]]);
  });

  it('holds 50 items of up to 120 characters; empty ones are refused', async () => {
    const mai = await person('maimai');
    await mai.post('/api/todos', { text: '   ' }).expect(400);
    await mai.post('/api/todos', { text: 'x'.repeat(121) }).expect(400);
    await prisma.todo.createMany({
      data: Array.from({ length: TODO_LIMIT }, (_, i) => ({ userId: mai.id, text: `t${i}`, position: i + 1 })),
    });
    const full = await mai.post('/api/todos', { text: 'one more' }).expect(409);
    expect(full.body.code).toBe('full');
  });

  it('done items older than 7 days are hidden, then removed by the nightly job', async () => {
    const mai = await person('maimai');
    const old = (await mai.post('/api/todos', { text: 'Old one' }).expect(201)).body;
    const recent = (await mai.post('/api/todos', { text: 'Recent one' }).expect(201)).body;
    await mai.post('/api/todos', { text: 'Still to do' }).expect(201);
    await prisma.todo.update({ where: { id: old.id }, data: { done: true, doneAt: new Date(Date.now() - 8 * 86_400_000) } });
    await prisma.todo.update({ where: { id: recent.id }, data: { done: true, doneAt: new Date(Date.now() - 6 * 86_400_000) } });
    expect(await texts(mai)).toEqual([
      ['Recent one', true],
      ['Still to do', false],
    ]);
    expect(await app.get(TodosService).purgeDone()).toBe(1);
    expect(await prisma.todo.count()).toBe(2);
  });

  it('guests have no list', async () => {
    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    await guest.put('/api/me/guest', { name: 'Mint', look: LOOK }).expect(200);
    const res = await guest.get('/api/todos');
    expect(res.status).toBeGreaterThanOrEqual(400);
    await guest.post('/api/todos', { text: 'Nope' }).expect(res.status);
  });
});
