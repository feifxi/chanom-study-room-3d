import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { giftPrice, PLUS_PLANS, type PayMethod, type PlanId } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import type { Env } from '../config/env.js';
import { hasPlus } from '../plus/plus.js';
import { PlusService } from '../plus/plus.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DmsService } from '../dms/dms.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { toPerson } from '../rooms/person.js';
import type { Billing, CheckoutStart, GiftBody } from './billing.schemas.js';
import { StripeGateway, type StripeEvent } from './stripe.gateway.js';

const addMonths = (from: Date, months: number) => {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};
const later = (a: Date, b: Date | null | undefined) => (b && b > a ? b : a);
const DAY_MS = 86_400_000;

/**
 * Paying for Plus (spec 15, "Paying"): start a checkout, learn it was paid (Stripe's webhook, or the
 * local stand-in), cancel or keep renewing. Paying moves `users.plus_until` on; PlusService tells
 * everyone when Plus starts or ends. Every payment is a receipt; a notice delivered twice pays once.
 */
@Injectable()
export class BillingService {
  private readonly log = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plus: PlusService,
    private readonly stripe: StripeGateway,
    private readonly config: ConfigService<Env, true>,
    private readonly dms: DmsService,
    private readonly inbox: NotificationsService,
  ) {}

  async view(userId: string, now = new Date()): Promise<Billing> {
    const [user, sub, receipts, gifts] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plusUntil: true } }),
      this.prisma.plusSubscription.findUnique({ where: { userId } }),
      this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 24 }),
      this.prisma.checkout.findMany({
        where: { userId, status: 'paid', giftToId: { not: null } },
        include: { giftTo: true },
        orderBy: { paidAt: 'desc' },
        take: 24,
      }),
    ]);
    return {
      plus: hasPlus(user, now),
      until: user.plusUntil?.toISOString() ?? null,
      plan: sub?.plan ?? null,
      method: (sub?.method as PayMethod | undefined) ?? null,
      renews: !!sub?.renews && hasPlus(user, now),
      receipts: receipts.map((r) => ({
        id: r.id,
        at: r.createdAt.toISOString(),
        what: r.what,
        amount: r.amount,
        method: r.method as PayMethod,
      })),
      giftsSent: gifts.map((g) => ({ to: toPerson(g.giftTo!), months: g.giftMonths ?? 0, at: (g.paidAt ?? g.createdAt).toISOString() })),
      stripe: this.stripe.enabled,
    };
  }

  /** The payment page's Continue: Stripe's page, or the local stand-in */
  async checkout(userId: string, plan: PlanId, method: PayMethod, now = new Date()): Promise<CheckoutStart> {
    const user = await requireSignedUp(this.prisma, userId);
    const sub = await this.prisma.plusSubscription.findUnique({ where: { userId } });
    // A card renews by itself; PromptPay renews by paying again (the reminder's link), on top
    if (sub?.renews && sub.method === 'card' && hasPlus(user, now)) {
      throw new ConflictException({ code: 'already_plus', message: 'You have Plus already; it renews by itself' });
    }
    const checkout = await this.prisma.checkout.create({ data: { userId, plan, method } });
    if (!this.stripe.enabled) return { checkoutId: checkout.id, url: null };
    const session = await this.stripe.checkout({ checkoutId: checkout.id, plan, method, email: user.email });
    await this.prisma.checkout.update({ where: { id: checkout.id }, data: { stripeSessionId: session.id } });
    return { checkoutId: checkout.id, url: session.url };
  }

  /** Gift Plus for a friend: Stripe's page (one payment), or the local stand-in */
  async gift(userId: string, body: GiftBody): Promise<CheckoutStart> {
    const user = await requireSignedUp(this.prisma, userId);
    const to = await this.prisma.user.findUnique({ where: { handle: body.handle } });
    if (!to || to.deleteAt || to.id === userId) throw new NotFoundException();
    if (!(await this.prisma.friendship.findUnique({ where: { userId_friendId: { userId, friendId: to.id } } }))) {
      throw new ForbiddenException({ code: 'not_friends', message: 'You can gift Plus to friends only' });
    }
    const price = giftPrice(body.months);
    if (!price) throw new BadRequestException('Pick 1, 3 or 12 months');
    const checkout = await this.prisma.checkout.create({
      data: { userId, plan: 'gift', method: body.method, giftToId: to.id, giftMonths: body.months, giftNote: body.note || null },
    });
    if (!this.stripe.enabled) return { checkoutId: checkout.id, url: null };
    const session = await this.stripe.giftCheckout({
      checkoutId: checkout.id,
      months: body.months,
      price,
      method: body.method,
      email: user.email,
      back: `/home/messages/${to.handle}`,
    });
    await this.prisma.checkout.update({ where: { id: checkout.id }, data: { stripeSessionId: session.id } });
    return { checkoutId: checkout.id, url: session.url };
  }

  /** The local stand-in's Pay (never in production, never when Stripe is on) */
  async devPay(userId: string, checkoutId: string, now = new Date()): Promise<Billing> {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production' || this.stripe.enabled) throw new NotFoundException();
    const checkout = await this.prisma.checkout.findUnique({ where: { id: checkoutId } });
    if (checkout?.userId !== userId) throw new NotFoundException();
    await this.paid(checkoutId, { ref: `local:${checkoutId}` }, now);
    return this.view(userId, now);
  }

  /**
   * A checkout was paid: Plus for the plan's months (on top of any Plus left), a receipt, and the
   * plan on the account; or, for a gift, the months on the friend's Plus, a gift card in your DM and
   * a 🔔 notice. Once only: a second notice finds the checkout paid already.
   */
  async paid(
    checkoutId: string,
    got: { ref: string; customerId?: string | null; subscriptionId?: string | null; periodEnd?: Date | null },
    now = new Date(),
  ) {
    const checkout = await this.prisma.checkout.findUnique({ where: { id: checkoutId }, include: { user: true, giftTo: true } });
    if (!checkout) return;
    const gift = checkout.giftTo && checkout.giftMonths ? { to: checkout.giftTo, months: checkout.giftMonths } : null;
    const plan = gift ? null : PLUS_PLANS[checkout.plan as PlanId];
    const who = gift?.to ?? checkout.user;
    const months = gift?.months ?? plan!.months;
    const wasPlus = hasPlus(who, now);
    // A card's period comes from Stripe; otherwise months from today or from the Plus they have left
    const until = later(got.periodEnd ?? addMonths(later(now, who.plusUntil), months), who.plusUntil);
    const what = gift ? `Gift for ${gift.to.name} · ${months} month${months > 1 ? 's' : ''}` : `Plus · ${plan!.label}`;
    const amount = gift ? giftPrice(months)! : plan!.price;
    const done = await this.prisma.$transaction(async (tx) => {
      const marked = await tx.checkout.updateMany({ where: { id: checkoutId, status: 'open' }, data: { status: 'paid', paidAt: now } });
      if (!marked.count) return false;
      if (!gift) {
        const fields = {
          plan: checkout.plan,
          method: checkout.method,
          renews: true,
          stripeCustomerId: got.customerId ?? null,
          stripeSubscriptionId: got.subscriptionId ?? null,
        };
        await tx.plusSubscription.upsert({
          where: { userId: checkout.userId },
          create: { userId: checkout.userId, ...fields },
          update: fields,
        });
      }
      await tx.payment.create({ data: { userId: checkout.userId, what, amount, method: checkout.method, ref: got.ref } });
      await tx.user.update({ where: { id: who.id }, data: { plusUntil: until } });
      return true;
    });
    if (!done) return;
    await this.plus.announce(who.id, wasPlus, now);
    if (gift) await this.delivered(checkout.user, gift.to.id, gift.months, checkout.giftNote, until);
    // Your tabs refresh the receipts too (the friend's tabs heard above)
    if (gift) await this.plus.announce(checkout.userId, hasPlus(checkout.user, now), now);
  }

  /** A paid gift reaches the friend: the card, the notice, and a card plan's next charge moved on */
  private async delivered(
    from: Parameters<typeof toPerson>[0] & { id: string },
    toId: string,
    months: number,
    note: string | null,
    until: Date,
  ) {
    const tell = async (what: string, job: () => Promise<unknown>) => {
      // Paid is paid: a hiccup here never undoes the gift
      await job().catch((error: unknown) => this.log.warn(`Gift ${what}: ${String(error)}`));
    };
    await tell('card', () => this.dms.giftCard(from.id, toId, { months, note }));
    await tell('notice', () => this.inbox.gift(toId, toPerson(from), months));
    const sub = await this.prisma.plusSubscription.findUnique({ where: { userId: toId } });
    if (sub?.renews && sub.stripeSubscriptionId && this.stripe.enabled) {
      await tell('renewal', () => this.stripe.moveRenewal(sub.stripeSubscriptionId!, until));
    }
  }

  /** Settings → Cancel Plus: it runs to the date, then ends (a card stops renewing at Stripe too) */
  async cancel(userId: string, now = new Date()): Promise<Billing> {
    await this.setRenews(userId, false, now);
    return this.view(userId, now);
  }

  /** Settings → Turn renewal back on, while Plus is still running */
  async resume(userId: string, now = new Date()): Promise<Billing> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!hasPlus(user, now)) throw new ConflictException({ code: 'ended', message: 'Plus has ended; get it again from the Plus page' });
    await this.setRenews(userId, true, now);
    return this.view(userId, now);
  }

  private async setRenews(userId: string, renews: boolean, now: Date) {
    const sub = await this.prisma.plusSubscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('You don’t have a Plus plan');
    if (sub.renews === renews) return;
    if (sub.stripeSubscriptionId) await this.stripe.cancelAtPeriodEnd(sub.stripeSubscriptionId, !renews);
    await this.prisma.plusSubscription.update({ where: { userId }, data: { renews } });
    await this.plus.announce(userId, hasPlus(await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }), now), now);
  }

  // ── Stripe's webhook ──────────────────────────────────────────────────────────────────────────

  async stripeEvent(event: StripeEvent, now = new Date()) {
    const o = event.data.object;
    switch (event.type) {
      // Paid at checkout (PromptPay finishes a little later: the async one)
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        if (o.payment_status !== 'paid' || typeof o.client_reference_id !== 'string') return;
        const subscriptionId = typeof o.subscription === 'string' ? o.subscription : null;
        await this.paid(
          o.client_reference_id,
          {
            ref: String(o.id),
            customerId: typeof o.customer === 'string' ? o.customer : null,
            subscriptionId,
            periodEnd: subscriptionId ? await this.stripe.periodEnd(subscriptionId) : null,
          },
          now,
        );
        return;
      }
      // A card renewed (the first invoice is the checkout's, counted above)
      case 'invoice.paid': {
        if (o.billing_reason !== 'subscription_cycle') return;
        const parent = o.parent as { subscription_details?: { subscription?: unknown } | null } | null;
        const subscriptionId = parent?.subscription_details?.subscription;
        const lines = o.lines as { data?: { period?: { end?: number } }[] } | undefined;
        const end = lines?.data?.[0]?.period?.end;
        if (typeof subscriptionId !== 'string' || !end) return;
        await this.renewed(
          subscriptionId,
          { ref: String(o.id), amount: Math.round(Number(o.amount_paid ?? 0) / 100), until: new Date(end * 1000) },
          now,
        );
        return;
      }
      // A renewal failed: Stripe tries again over about two weeks, and Plus stays on meanwhile
      case 'invoice.payment_failed': {
        const parent = o.parent as { subscription_details?: { subscription?: unknown } | null } | null;
        const subscriptionId = parent?.subscription_details?.subscription;
        const next = typeof o.next_payment_attempt === 'number' ? new Date(o.next_payment_attempt * 1000 + DAY_MS) : null;
        if (typeof subscriptionId !== 'string' || !next) return;
        const sub = await this.prisma.plusSubscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
          include: { user: true },
        });
        if (!sub || !sub.user.plusUntil || sub.user.plusUntil >= next) return;
        const wasPlus = hasPlus(sub.user, now);
        await this.prisma.user.update({ where: { id: sub.userId }, data: { plusUntil: next } });
        await this.plus.announce(sub.userId, wasPlus, now);
        return;
      }
      // Cancelled or resumed at Stripe (or by us), or ended after the last failed retry
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const renews = event.type === 'customer.subscription.updated' && !o.cancel_at_period_end;
        await this.prisma.plusSubscription.updateMany({ where: { stripeSubscriptionId: String(o.id) }, data: { renews } });
        return;
      }
    }
  }

  private async renewed(subscriptionId: string, got: { ref: string; amount: number; until: Date }, now: Date) {
    const sub = await this.prisma.plusSubscription.findUnique({ where: { stripeSubscriptionId: subscriptionId }, include: { user: true } });
    if (!sub) return this.log.warn(`Renewal for an unknown subscription ${subscriptionId}`);
    const plan = PLUS_PLANS[sub.plan as PlanId];
    const wasPlus = hasPlus(sub.user, now);
    const fresh = await this.prisma.payment.findUnique({ where: { ref: got.ref } });
    if (fresh) return;
    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: { userId: sub.userId, what: `Plus · ${plan.label}`, amount: got.amount || plan.price, method: 'card', ref: got.ref },
      }),
      this.prisma.user.update({ where: { id: sub.userId }, data: { plusUntil: later(got.until, sub.user.plusUntil) } }),
    ]);
    await this.plus.announce(sub.userId, wasPlus, now);
  }
}
