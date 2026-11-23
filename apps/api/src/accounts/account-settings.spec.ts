import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { browser, createTestApp, LOOK, resetAccounts, signInWithCode } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AccountsService } from './accounts.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
});
afterAll(() => app?.close());
beforeEach(() => resetAccounts(prisma));

const DAY = 24 * 60 * 60 * 1000;

/** A browser signed in to a finished account. */
async function member(email: string, handle: string) {
  const b = browser(app);
  await signInWithCode(b, sent, email);
  await b.post('/api/me/birthday', { birthday: '2004-05-14' }).expect(200);
  await b.post('/api/me/sign-up', { name: handle, handle, look: LOOK }).expect(200);
  return b;
}

describe('My profile and My character', () => {
  it('changes the display name and the look', async () => {
    const b = await member('mai@example.com', 'maimai');
    const look = { hair: '#46527f', outfit: '#e84855', accessory: 'glasses' };
    const res = await b.patch('/api/me/profile', { name: 'Mai 🌸', look }).expect(200);
    expect(res.body).toMatchObject({ name: 'Mai 🌸', look });
  });

  it('needs a finished sign-up', async () => {
    const b = browser(app);
    await signInWithCode(b, sent, 'new@example.com');
    await b.patch('/api/me/profile', { name: 'New' }).expect(403);
  });
});

describe('changing the @handle', () => {
  it('allows the first change, then waits 30 days', async () => {
    const b = await member('mai@example.com', 'maimai');
    await b.put('/api/me/handle', { handle: 'mai.chan' }).expect(200);
    const res = await b.put('/api/me/handle', { handle: 'mai.again' }).expect(409);
    expect(res.body).toMatchObject({ code: 'too_soon' });
    expect(new Date(res.body.nextChangeAt).getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it('holds the old handle for its owner, who can take it back', async () => {
    const mai = await member('mai@example.com', 'maimai');
    await mai.put('/api/me/handle', { handle: 'mai.chan' }).expect(200);

    const pim = await member('pim@example.com', 'pimmy');
    expect((await pim.get('/api/handles/maimai')).body).toMatchObject({ available: false });
    await pim.put('/api/me/handle', { handle: 'maimai' }).expect(409);

    // Mai's 30 days are up (pretend), and she changes back
    await prisma.user.update({ where: { email: 'mai@example.com' }, data: { handleChangedAt: new Date(Date.now() - 31 * DAY) } });
    expect((await mai.get('/api/handles/maimai')).body).toMatchObject({ available: true });
    await mai.put('/api/me/handle', { handle: 'maimai' }).expect(200);
    // Now mai.chan is held for her instead
    expect(await prisma.handleHold.findUnique({ where: { handle: 'mai.chan' } })).toMatchObject({ until: expect.any(Date) });
    expect(await prisma.handleHold.findUnique({ where: { handle: 'maimai' } })).toBeNull();
  });
});

describe('Settings → Account', () => {
  it('shows the private details', async () => {
    const b = await member('mai@example.com', 'maimai');
    const res = await b.get('/api/me/account').expect(200);
    expect(res.body).toEqual({
      email: 'mai@example.com',
      birthday: '2004-05-14',
      linked: { google: null, discord: null },
      available: { google: false, discord: false },
      nextHandleChangeAt: null,
    });
  });
});

describe('deleting an account', () => {
  it('waits 7 days, signs out other browsers, and can be kept', async () => {
    const b = await member('mai@example.com', 'maimai');
    const other = browser(app);
    await signInWithCode(other, sent, 'mai@example.com');

    await b.post('/api/me/deletion', { handle: 'wrong' }).expect(400);
    const res = await b.post('/api/me/deletion', { handle: '@maimai' }).expect(200);
    expect(new Date(res.body.deleteAt).getTime()).toBeGreaterThan(Date.now() + 6 * DAY);
    await other.get('/api/me').expect(401);
    // Nothing else works until it's kept
    await b.patch('/api/me/profile', { name: 'Mai' }).expect(403);

    const kept = await b.delete('/api/me/deletion').expect(200);
    expect(kept.body.deleteAt).toBeNull();
    await b.patch('/api/me/profile', { name: 'Mai' }).expect(200);
  });

  it('removes everything personal after 7 days and holds the handle', async () => {
    const b = await member('mai@example.com', 'maimai');
    await b.post('/api/me/deletion', { handle: 'maimai' }).expect(200);
    const accounts = app.get(AccountsService);

    expect(await accounts.purgeDue()).toBe(0); // not yet
    expect(await accounts.purgeDue(new Date(Date.now() + 8 * DAY))).toBe(1);

    const user = await prisma.user.findFirstOrThrow({ where: { deletedAt: { not: null } } });
    expect(user).toMatchObject({ name: 'Deleted user', handle: null, birthday: null, look: null });
    expect(user.email).not.toContain('mai@example.com');
    await b.get('/api/me').expect(401);

    // The handle stays held, and the email is free for a brand-new account
    const pim = await member('pim@example.com', 'pimmy');
    expect((await pim.get('/api/handles/maimai')).body).toMatchObject({ available: false });
    const again = browser(app);
    await signInWithCode(again, sent, 'mai@example.com');
    expect((await again.get('/api/me')).body).toMatchObject({ signedUp: false });
  });
});

describe('Settings → Notifications', () => {
  it('keeps "hide game invites while I’m focusing" on the account (off by default)', async () => {
    const b = await member('mai@example.com', 'maimai');
    expect((await b.get('/api/me').expect(200)).body.hideInvitesWhileFocusing).toBe(false);
    const res = await b.patch('/api/me/notifications', { hideInvitesWhileFocusing: true }).expect(200);
    expect(res.body.hideInvitesWhileFocusing).toBe(true);
    expect((await b.get('/api/me').expect(200)).body.hideInvitesWhileFocusing).toBe(true);
  });
});
