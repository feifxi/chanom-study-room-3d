import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { browser, createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
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
beforeEach(() => resetAccounts(prisma));

type Person = Browser & { id: string };
const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;
async function team() {
  const t = await person('teamtam');
  await prisma.user.update({ where: { id: t.id }, data: { team: true } });
  return t;
}
/** Signing in by email code again: the code step's answer */
async function signInAgain(handle: string) {
  const b = browser(app);
  const email = `${handle}@example.com`;
  await b.post('/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' }).expect(200);
  const otp = sent.findLast((m) => m.to === email)!.subject.slice(0, 6);
  return b.post('/api/auth/sign-in/email-otp', { email, otp });
}

describe('the admin site', () => {
  it('is not found for anyone off the team', async () => {
    const mai = await person('maimai');
    await mai.get('/api/admin/users').expect(404);
    await mai.get(`/api/admin/users/${mai.id}`).expect(404);
    await mai.post(`/api/admin/users/${mai.id}/actions`, { kind: 'warn', reason: 'testing' }).expect(404);
  });

  it('lists accounts (not guests), by name or @handle and a filter', async () => {
    const t = await team();
    await person('maimai');
    await person('jod');
    const guest = browser(app);
    await guest.post('/api/auth/sign-in/anonymous').expect(200);
    const all = (await t.get('/api/admin/users').expect(200)).body;
    expect(all.total).toBe(3);
    expect((await t.get('/api/admin/users?q=@mai').expect(200)).body.accounts.map((a: { handle: string }) => a.handle)).toEqual(['maimai']);
    expect((await t.get('/api/admin/users?filter=restricted').expect(200)).body.total).toBe(0);
  });

  it('a suspension signs them out everywhere, refuses sign-in with the reason, is emailed and logged; lifting undoes it', async () => {
    const t = await team();
    const mai = await person('maimai');
    const done = (await t.post(`/api/admin/users/${mai.id}/actions`, { kind: 'suspend_1d', reason: 'Spamming invite links' }).expect(200))
      .body;
    expect(done).toMatchObject({ status: 'suspended', actions: [{ kind: 'suspend', reason: 'Spamming invite links', by: 'teamtam' }] });
    await mai.get('/api/me').expect(204); // signed out
    const refused = await signInAgain('maimai');
    expect(refused.status).toBe(403);
    expect(refused.body.message).toMatch(
      /^Your account is suspended until .* UTC\. Reason: Spamming invite links\. Reply to our email to appeal\.$/,
    );
    expect(sent.findLast((m) => m.to === 'maimai@example.com' && m.subject.includes('suspended'))?.text).toContain('Spamming invite links');
    expect(await prisma.auditEntry.findFirst({ where: { action: 'account.suspend', targetId: mai.id, byId: t.id } })).not.toBeNull();
    expect((await t.get('/api/admin/users?filter=restricted').expect(200)).body.total).toBe(1);

    await t.post(`/api/admin/users/${mai.id}/actions`, { kind: 'lift', reason: 'Appeal accepted' }).expect(200);
    expect((await signInAgain('maimai')).status).toBe(200);
  });

  it('bans, warns and resets names; never on the team', async () => {
    const t = await team();
    const mai = await person('maimai');
    await prisma.user.update({ where: { id: mai.id }, data: { name: 'Rude name' } });
    expect(
      (await t.post(`/api/admin/users/${mai.id}/actions`, { kind: 'reset_name', reason: 'Offensive name' }).expect(200)).body.name,
    ).toBe('maimai');
    expect((await t.post(`/api/admin/users/${mai.id}/actions`, { kind: 'warn', reason: 'Be kind' }).expect(200)).body.status).toBe(
      'warned',
    );
    await t.post(`/api/admin/users/${mai.id}/actions`, { kind: 'ban', reason: 'Threats' }).expect(200);
    expect((await signInAgain('maimai')).body.message).toBe('Your account is banned. Reason: Threats. Reply to our email to appeal.');
    const other = await person('otherteam');
    await prisma.user.update({ where: { id: other.id }, data: { team: true } });
    await t.post(`/api/admin/users/${other.id}/actions`, { kind: 'warn', reason: 'testing' }).expect(403);
    await t.post(`/api/admin/users/${mai.id}/actions`, { kind: 'warn', reason: '' }).expect(400);
  });
});
