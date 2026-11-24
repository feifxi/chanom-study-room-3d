import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { browser, createTestApp, LOOK, resetAccounts, signInWithCode } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AccountsService, GUEST_KEEP_DAYS } from './accounts.service.js';

let app: INestApplication;
let sent: Mail[];
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, sent, prisma } = await createTestApp());
});
afterAll(() => app?.close());
beforeEach(() => resetAccounts(prisma));

/** A browser that has signed in and passed the birthday step. */
async function adult(email: string) {
  const b = browser(app);
  await signInWithCode(b, sent, email);
  await b.post('/api/me/birthday', { birthday: '2004-05-14' }).expect(200);
  return b;
}

describe('signing in with an email code', () => {
  it('answers 204 from /api/me when signed out', async () => {
    await browser(app).get('/api/me').expect(204);
  });

  it('emails a 6-digit code and signs in with it', async () => {
    const b = browser(app);
    await signInWithCode(b, sent, 'mai@example.com');
    const me = await b.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ email: 'mai@example.com', isGuest: false, ageChecked: false, signedUp: false });
  });

  it('refuses a wrong code', async () => {
    const b = browser(app);
    await b.post('/api/auth/email-otp/send-verification-otp', { email: 'mai@example.com', type: 'sign-in' }).expect(200);
    const res = await b.post('/api/auth/sign-in/email-otp', { email: 'mai@example.com', otp: '000000' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    await b.get('/api/me').expect(204);
  });
});

describe('the birthday step', () => {
  it('locks the sign-in and the browser for a day when under 13, without keeping the birthday', async () => {
    const b = browser(app);
    await signInWithCode(b, sent, 'kid@example.com');
    const res = await b.post('/api/me/birthday', { birthday: '2016-01-01' }).expect(403);
    expect(res.body).toMatchObject({ code: 'too_young' });
    // Picking another year doesn't help
    await b.post('/api/me/birthday', { birthday: '2000-01-01' }).expect(403);
    expect((await prisma.user.findFirstOrThrow({ where: { email: 'kid@example.com' } })).birthday).toBeNull();

    // Nor does another sign-in from the same browser
    await signInWithCode(b, sent, 'kid2@example.com');
    await b.post('/api/me/birthday', { birthday: '2000-01-01' }).expect(403);
  });

  it('accepts 13 and over', async () => {
    const b = await adult('mai@example.com');
    expect((await b.get('/api/me')).body).toMatchObject({ ageChecked: true, signedUp: false });
  });
});

describe('finishing sign-up', () => {
  it('needs the birthday first', async () => {
    const b = browser(app);
    await signInWithCode(b, sent, 'mai@example.com');
    await b.post('/api/me/sign-up', { name: 'Mai', handle: 'maimai', look: LOOK }).expect(403);
  });

  it('sets the character, name and @handle', async () => {
    const b = await adult('mai@example.com');
    const res = await b.post('/api/me/sign-up', { name: 'Mai', handle: 'maimai', look: LOOK }).expect(200);
    expect(res.body).toMatchObject({ name: 'Mai', handle: 'maimai', look: LOOK, signedUp: true });
    await b.post('/api/me/sign-up', { name: 'Mai', handle: 'maimai2', look: LOOK }).expect(409);
  });

  it('offers other handles when one is taken', async () => {
    await (await adult('mai@example.com')).post('/api/me/sign-up', { name: 'Mai', handle: 'maimai', look: LOOK });
    const b = await adult('pim@example.com');
    const check = await b.get('/api/handles/maimai').expect(200);
    expect(check.body).toMatchObject({ available: false, reason: '@maimai is taken' });
    expect(check.body.suggestions).toContain('maimai_');
    const res = await b.post('/api/me/sign-up', { name: 'Pim', handle: 'maimai', look: LOOK }).expect(409);
    expect(res.body).toMatchObject({ code: 'handle_unavailable' });
  });

  it('refuses reserved handles and looks outside the palette', async () => {
    const b = await adult('mai@example.com');
    expect((await b.get('/api/handles/admin')).body).toMatchObject({ available: false, reason: '@admin is reserved' });
    await b.post('/api/me/sign-up', { name: 'Mai', handle: 'admin', look: LOOK }).expect(409);
    await b.post('/api/me/sign-up', { name: 'Mai', handle: 'maimai', look: { ...LOOK, hair: '#bad' } }).expect(400);
  });

  it('refuses a blocked word in the name or the @handle', async () => {
    const b = await adult('mai@example.com');
    expect((await b.get('/api/handles/fuckboy').expect(200)).body).toMatchObject({ available: false });
    await b.post('/api/me/sign-up', { name: 'Mai', handle: 'fuckboy', look: LOOK }).expect(409);
    await b.post('/api/me/sign-up', { name: 'ไอ้สัส', handle: 'maimai', look: LOOK }).expect(400);
    await b.post('/api/me/sign-up', { name: 'Mai', handle: 'maimai', look: LOOK }).expect(200);
  });
});

describe('guests', () => {
  it('walk in with a name and a character, and keep the character when they sign up', async () => {
    const b = browser(app);
    await b.post('/api/auth/sign-in/anonymous').expect(200);
    const guestLook = { hair: '#c8e3ff', outfit: '#12a37f', accessory: 'headphones' };
    const guest = await b.put('/api/me/guest', { name: 'Mochi', look: guestLook }).expect(200);
    expect(guest.body).toMatchObject({ name: 'Mochi', isGuest: true, email: null });
    // Guests have no birthday step
    await b.post('/api/me/birthday', { birthday: '2004-05-14' }).expect(403);

    await signInWithCode(b, sent, 'mochi@example.com');
    const me = await b.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ name: 'Mochi', look: guestLook, isGuest: false, email: 'mochi@example.com' });
    // The guest is gone
    expect(await prisma.user.count({ where: { isAnonymous: true } })).toBe(0);
  });

  it('a guest who never came back goes after 30 days; one with a live session stays', async () => {
    const b = browser(app);
    await b.post('/api/auth/sign-in/anonymous').expect(200);
    await b.put('/api/me/guest', { name: 'Mochi', look: LOOK }).expect(200);
    const accounts = app.get(AccountsService);
    const later = new Date(Date.now() + (GUEST_KEEP_DAYS + 1) * 86_400_000);
    // Still signed in (the session runs past "now"): kept
    expect(await accounts.purgeGuests()).toBe(0);
    // Long after, with the session expired: gone
    expect(await accounts.purgeGuests(later)).toBe(1);
    expect(await prisma.user.count({ where: { isAnonymous: true } })).toBe(0);
  });
});
