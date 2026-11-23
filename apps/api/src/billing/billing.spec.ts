import type { INestApplication } from '@nestjs/common';
import Stripe from 'stripe';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ORIGIN, resetAccounts, signedUp, type Browser } from '../../test/test-app.js';
import type { Mail } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { StripeGateway, type StripeEvent } from './stripe.gateway.js';

type Person = Browser & { id: string };
const DAY = 86_400_000;

describe('paying for Plus with the local stand-in (no Stripe keys)', () => {
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
  const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;

  it('pays once for a month, keeps a receipt, then cancels and resumes', async () => {
    const mai = await person('maimai');
    const start = (await mai.post('/api/billing/checkout', { plan: 'monthly', method: 'promptpay' }).expect(200)).body;
    expect(start.url).toBeNull();
    const paid = (await mai.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(200)).body;
    expect(paid).toMatchObject({ plus: true, plan: 'monthly', method: 'promptpay', renews: true, stripe: false });
    expect(paid.receipts).toEqual([expect.objectContaining({ what: 'Plus · Monthly', amount: 89, method: 'promptpay' })]);
    const days = (Date.parse(paid.until) - Date.now()) / DAY;
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);
    // Paying the same checkout again changes nothing
    expect((await mai.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(200)).body.receipts).toHaveLength(1);
    // It renews already: no second plan
    expect((await mai.post('/api/billing/checkout', { plan: 'yearly', method: 'card' }).expect(409)).body.code).toBe('already_plus');

    const cancelled = (await mai.post('/api/billing/cancel').expect(200)).body;
    expect(cancelled).toMatchObject({ plus: true, renews: false });
    expect((await mai.get('/api/me').expect(200)).body.plus).toBe(true);
    expect((await mai.post('/api/billing/resume').expect(200)).body.renews).toBe(true);
  });

  it('a yearly plan after a cancelled one adds on top of the Plus left', async () => {
    const mai = await person('maimai');
    const first = (await mai.post('/api/billing/checkout', { plan: 'monthly', method: 'card' }).expect(200)).body;
    const month = (await mai.post(`/api/billing/checkout/${first.checkoutId}/dev-pay`).expect(200)).body;
    await mai.post('/api/billing/cancel').expect(200);
    const second = (await mai.post('/api/billing/checkout', { plan: 'yearly', method: 'card' }).expect(200)).body;
    const year = (await mai.post(`/api/billing/checkout/${second.checkoutId}/dev-pay`).expect(200)).body;
    expect(year).toMatchObject({ plan: 'yearly', renews: true });
    expect((Date.parse(year.until) - Date.parse(month.until)) / DAY).toBeGreaterThan(360);
    expect(year.receipts.map((r: { amount: number }) => r.amount)).toEqual([890, 89]);
  });

  const friends = async (a: Person, b: Person, bHandle: string) => {
    await a.post('/api/friends/requests', { handle: bHandle }).expect(200);
    await b.post(`/api/friends/requests/${a.id}/accept`).expect(200);
  };

  it('Gift Plus: the friend gets the months, a card in your DM and a notice; you get the receipt', async () => {
    const mai = await person('maimai');
    const jod = await person('jod.dev');
    const bow = await person('bowbow');
    // Friends only
    expect((await mai.post('/api/billing/gift', { handle: 'jod.dev', months: 3, method: 'card' }).expect(403)).body.code).toBe(
      'not_friends',
    );
    await friends(mai, jod, 'jod.dev');
    await mai.post('/api/billing/gift', { handle: 'jod.dev', months: 2, method: 'card' }).expect(400);
    await mai.post('/api/billing/gift', { handle: 'maimai', months: 1, method: 'card' }).expect(404);

    // Jod already has a month of Plus: the gift adds on top
    const own = (await jod.post('/api/billing/checkout', { plan: 'monthly', method: 'promptpay' }).expect(200)).body;
    const before = (await jod.post(`/api/billing/checkout/${own.checkoutId}/dev-pay`).expect(200)).body.until;
    const start = (
      await mai.post('/api/billing/gift', { handle: 'jod.dev', months: 3, note: 'thanks for hosting 🫶', method: 'promptpay' }).expect(200)
    ).body;
    expect(start.url).toBeNull();
    await bow.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(404);
    const mine = (await mai.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(200)).body;
    expect(mine.plus).toBe(false);
    expect(mine.receipts).toEqual([expect.objectContaining({ what: 'Gift for jod.dev · 3 months', amount: 249, method: 'promptpay' })]);
    expect(mine.giftsSent).toEqual([expect.objectContaining({ months: 3, to: expect.objectContaining({ handle: 'jod.dev' }) })]);
    // Once only
    await mai.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(200);

    const theirs = (await jod.get('/api/billing').expect(200)).body;
    const added = (Date.parse(theirs.until) - Date.parse(before)) / DAY;
    expect(added).toBeGreaterThan(88);
    expect(added).toBeLessThan(93);
    // The price is never on their side
    expect(theirs.receipts).toHaveLength(1);

    const dm = (await jod.put('/api/dms/with/maimai').expect(200)).body;
    const page = (await jod.get(`/api/dms/${dm.id}/messages`).expect(200)).body;
    const cards = page.messages.filter((m: { kind: string }) => m.kind === 'gift');
    expect(cards).toHaveLength(1);
    expect(cards[0].card.gift).toEqual({ months: 3, note: 'thanks for hosting 🫶' });
    const inbox = (await jod.get('/api/notifications').expect(200)).body;
    expect(inbox.items[0]).toMatchObject({ kind: 'gift', href: '/home/messages/maimai' });
    expect(inbox.items[0].text).toContain('gifted you 3 months of Plus');
  });

  it('nobody pays someone else’s checkout; Stripe’s webhook isn’t there without Stripe', async () => {
    const mai = await person('maimai');
    const jod = await person('jod.dev');
    const start = (await mai.post('/api/billing/checkout', { plan: 'monthly', method: 'card' }).expect(200)).body;
    await jod.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(404);
    await request(app.getHttpServer()).post('/api/billing/stripe-webhook').set('Origin', ORIGIN).send({}).expect(404);
  });
});

describe('paying for Plus with Stripe (a fake Stripe: nothing leaves the machine)', () => {
  let app: INestApplication;
  let sent: Mail[];
  let prisma: PrismaService;
  const calls: string[] = [];
  const rawBodies: Buffer[] = [];
  const periodEnd = new Date(Date.now() + 31 * DAY);
  const fake = {
    enabled: true,
    checkout: async (input: { checkoutId: string; method: string }) => {
      calls.push(`checkout:${input.method}`);
      return { id: `cs_${input.checkoutId}`, url: `https://checkout.stripe.test/${input.checkoutId}` };
    },
    giftCheckout: async (input: { checkoutId: string; method: string; back: string }) => {
      calls.push(`gift:${input.method}:${input.back}`);
      return { id: `cs_${input.checkoutId}`, url: `https://checkout.stripe.test/${input.checkoutId}` };
    },
    moveRenewal: async (id: string, to: Date) => void calls.push(`move:${id}:${to.toISOString()}`),
    periodEnd: async () => periodEnd,
    cancelAtPeriodEnd: async (id: string, cancel: boolean) => void calls.push(`cancel:${id}:${cancel}`),
    event: (raw: Buffer, signature: string): StripeEvent => {
      if (signature !== 'good') throw new Error('bad signature');
      rawBodies.push(raw);
      return JSON.parse(raw.toString('utf8')) as StripeEvent;
    },
  };
  beforeAll(async () => {
    ({ app, sent, prisma } = await createTestApp((b) => b.overrideProvider(StripeGateway).useValue(fake)));
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await resetAccounts(prisma);
    calls.length = 0;
  });
  const person = (handle: string) => signedUp(app, sent, handle) as Promise<Person>;
  const notice = (event: object, signature = 'good') =>
    request(app.getHttpServer())
      .post('/api/billing/stripe-webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(event));

  it('sends you to Stripe, and Stripe’s notice (once) gives you Plus; a renewal extends it', async () => {
    const mai = await person('maimai');
    const start = (await mai.post('/api/billing/checkout', { plan: 'monthly', method: 'card' }).expect(200)).body;
    expect(start.url).toBe(`https://checkout.stripe.test/${start.checkoutId}`);
    expect(calls).toEqual(['checkout:card']);
    await mai.post(`/api/billing/checkout/${start.checkoutId}/dev-pay`).expect(404);

    const completed = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${start.checkoutId}`,
          payment_status: 'paid',
          client_reference_id: start.checkoutId,
          subscription: 'sub_1',
          customer: 'cus_1',
        },
      },
    };
    await notice(completed, 'forged').expect(400);
    await notice(completed).expect(200);
    await notice(completed).expect(200);
    expect(rawBodies.at(-1)?.toString()).toBe(JSON.stringify(completed));
    const paid = (await mai.get('/api/billing').expect(200)).body;
    expect(paid).toMatchObject({ plus: true, plan: 'monthly', method: 'card', renews: true, stripe: true, until: periodEnd.toISOString() });
    expect(paid.receipts).toHaveLength(1);

    const next = new Date(periodEnd.getTime() + 30 * DAY);
    const invoice = {
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_2',
          billing_reason: 'subscription_cycle',
          amount_paid: 8900,
          parent: { subscription_details: { subscription: 'sub_1' } },
          lines: { data: [{ period: { end: Math.floor(next.getTime() / 1000) } }] },
        },
      },
    };
    await notice(invoice).expect(200);
    await notice(invoice).expect(200);
    const renewed = (await mai.get('/api/billing').expect(200)).body;
    expect(Date.parse(renewed.until)).toBe(Math.floor(next.getTime() / 1000) * 1000);
    expect(renewed.receipts).toHaveLength(2);
  });

  it('cancelling stops renewal at Stripe too; Stripe’s own cancel shows here', async () => {
    const mai = await person('maimai');
    const start = (await mai.post('/api/billing/checkout', { plan: 'yearly', method: 'card' }).expect(200)).body;
    await notice({
      type: 'checkout.session.completed',
      data: {
        object: { id: 'cs_y', payment_status: 'paid', client_reference_id: start.checkoutId, subscription: 'sub_y', customer: 'cus_y' },
      },
    }).expect(200);
    await mai.post('/api/billing/cancel').expect(200);
    await mai.post('/api/billing/resume').expect(200);
    expect(calls.slice(1)).toEqual(['cancel:sub_y:true', 'cancel:sub_y:false']);
    await notice({ type: 'customer.subscription.updated', data: { object: { id: 'sub_y', cancel_at_period_end: true } } }).expect(200);
    expect((await mai.get('/api/billing').expect(200)).body.renews).toBe(false);
  });

  it('a gift to a friend paying by card moves their next charge to the new date', async () => {
    const mai = await person('maimai');
    const jod = await person('jod.dev');
    await mai.post('/api/friends/requests', { handle: 'jod.dev' }).expect(200);
    await jod.post(`/api/friends/requests/${mai.id}/accept`).expect(200);
    const own = (await jod.post('/api/billing/checkout', { plan: 'monthly', method: 'card' }).expect(200)).body;
    await notice({
      type: 'checkout.session.completed',
      data: {
        object: { id: 'cs_j', payment_status: 'paid', client_reference_id: own.checkoutId, subscription: 'sub_j', customer: 'cus_j' },
      },
    }).expect(200);
    const gift = (await mai.post('/api/billing/gift', { handle: 'jod.dev', months: 1, method: 'card' }).expect(200)).body;
    expect(gift.url).toBe(`https://checkout.stripe.test/${gift.checkoutId}`);
    await notice({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_gift', payment_status: 'paid', client_reference_id: gift.checkoutId, subscription: null, customer: null } },
    }).expect(200);
    const until = (await jod.get('/api/billing').expect(200)).body.until;
    expect((Date.parse(until) - periodEnd.getTime()) / DAY).toBeGreaterThan(27);
    expect(calls).toEqual(['checkout:card', 'gift:card:/home/messages/jod.dev', `move:sub_j:${until}`]);
  });

  it('PromptPay finishes later: Plus once the payment goes through', async () => {
    const mai = await person('maimai');
    const start = (await mai.post('/api/billing/checkout', { plan: 'monthly', method: 'promptpay' }).expect(200)).body;
    const session = { id: 'cs_pp', client_reference_id: start.checkoutId, subscription: null, customer: null };
    await notice({ type: 'checkout.session.completed', data: { object: { ...session, payment_status: 'unpaid' } } }).expect(200);
    expect((await mai.get('/api/billing').expect(200)).body.plus).toBe(false);
    await notice({ type: 'checkout.session.async_payment_succeeded', data: { object: { ...session, payment_status: 'paid' } } }).expect(
      200,
    );
    expect((await mai.get('/api/billing').expect(200)).body).toMatchObject({ plus: true, method: 'promptpay' });
  });
});

describe('Stripe’s signature check', () => {
  it('accepts Stripe’s signed notice and refuses a changed one', () => {
    const config = {
      get: (key: string) => ({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', WEB_ORIGIN: ORIGIN })[key],
    };
    const gateway = new StripeGateway(config as never);
    const payload = JSON.stringify({ id: 'evt_1', type: 'invoice.paid', data: { object: {} } });
    const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
    expect(gateway.event(Buffer.from(payload), header).type).toBe('invoice.paid');
    expect(() => gateway.event(Buffer.from(payload.replace('invoice', 'evil')), header)).toThrow();
  });
});
