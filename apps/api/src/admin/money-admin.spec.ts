import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
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
const DAY = 86_400_000;

describe('the admin site: Money', () => {
  it('adds up what Plus brings in and refunds a real mistake (not a gift), emailed and logged', async () => {
    const t = await team();
    const mai = await person('maimai');
    const jod = await person('jod');
    await mai.get('/api/admin/money').expect(404);
    const soon = new Date(Date.now() + 20 * DAY);
    await prisma.user.updateMany({ where: { id: { in: [mai.id, jod.id] } }, data: { plusUntil: soon } });
    await prisma.plusSubscription.createMany({
      data: [
        { userId: mai.id, plan: 'monthly', method: 'card' },
        { userId: jod.id, plan: 'yearly', method: 'promptpay', renews: false },
      ],
    });
    const [paid] = await Promise.all([
      prisma.payment.create({ data: { userId: mai.id, what: 'Plus · Monthly', amount: 89, method: 'card', ref: 'local:a' } }),
      prisma.payment.create({ data: { userId: jod.id, what: 'Plus · Yearly', amount: 890, method: 'promptpay', ref: 'local:b' } }),
      prisma.payment.create({ data: { userId: mai.id, what: 'Gift for jod · 1 month', amount: 89, method: 'card', ref: 'local:c' } }),
    ]);

    const money = (await t.get('/api/admin/money').expect(200)).body;
    expect(money.stripe).toBe(false);
    expect(money.mix).toEqual(
      expect.arrayContaining([
        { plan: 'Monthly · card', people: 1, mrr: 89 },
        // Cancelled: still Plus until its end, no monthly revenue
        { plan: 'Yearly · PromptPay', people: 1, mrr: 0 },
      ]),
    );
    expect(money.stats.find((s: { label: string }) => s.label === 'Monthly revenue (MRR)').value).toBe('฿89');
    expect(money.stats.find((s: { label: string }) => s.label === 'Paid this month').value).toBe('฿1,068');
    const gift = money.payments.find((p: { what: string }) => p.what.startsWith('Gift'));
    expect(gift.refundable).toBe(false);
    await t.post(`/api/admin/money/payments/${gift.id}/refund`, { reason: 'A bug on our side' }).expect(400);

    await t.post(`/api/admin/money/payments/${paid.id}/refund`, { reason: 'Made up' }).expect(400);
    await t.post(`/api/admin/money/payments/${paid.id}/refund`, { reason: 'Charged twice' }).expect(204);
    await t.post(`/api/admin/money/payments/${paid.id}/refund`, { reason: 'Charged twice' }).expect(400);
    expect(sent.findLast((m) => m.to === 'maimai@example.com')).toMatchObject({ subject: 'We refunded ฿89 to you' });
    const refunded = (await t.get('/api/admin/money?filter=refunded').expect(200)).body.payments;
    expect(refunded).toMatchObject([{ id: paid.id, status: 'refunded', refund: { reason: 'Charged twice', by: 'teamtam' } }]);
    // A refund gives money back; Plus stays as it was
    expect((await prisma.user.findUnique({ where: { id: mai.id } }))?.plusUntil).toEqual(soon);

    // The audit log page shows it, by the team, with names
    const audit = (await t.get('/api/admin/audit?who=team').expect(200)).body;
    expect(audit.entries[0]).toMatchObject({ action: 'payment.refund', by: 'teamtam', target: 'maimai @maimai', reason: 'Charged twice' });
    expect((await t.get('/api/admin/audit?who=auto').expect(200)).body.entries).toEqual([]);
  });
});

describe('the admin site: Overview', () => {
  it('shows the numbers, a health strip, urgent reports and the latest actions', async () => {
    const t = await team();
    const mai = await person('maimai');
    const jod = await person('jod');
    await mai.get('/api/admin/overview').expect(404);
    await mai.post('/api/reports', { kind: 'person', userId: jod.id, place: 'common-cafe-1', reason: 'sexual' }).expect(200);
    await t.post(`/api/admin/users/${jod.id}/actions`, { kind: 'warn', reason: 'Testing the overview' }).expect(200);

    const o = (await t.get('/api/admin/overview').expect(200)).body;
    expect(o.stats.find((s: { label: string }) => s.label === 'Open reports')).toMatchObject({ value: '1', note: '1 urgent', warn: true });
    expect(o.stats.find((s: { label: string }) => s.label === 'Sign-ups, last 24 h').value).toBe('3');
    expect(o.urgent).toMatchObject([{ key: `person:${jod.id}`, reasons: ['Sexual content'] }]);
    expect(o.latest[0]).toMatchObject({ action: 'account.warn', target: 'jod @jod' });
    const health = Object.fromEntries(o.health.map((h: { name: string; status: string }) => [h.name, h.status]));
    expect(health).toMatchObject({ Database: 'ok', Redis: 'ok', Payments: 'warn' });
    expect(Object.keys(health)).toEqual([
      'Database',
      'Redis',
      'Game server',
      'Voice (LiveKit)',
      'Chat gateway',
      'Picture check',
      'Payments',
    ]);
  });
});
