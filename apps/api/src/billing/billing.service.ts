import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PLUS_PLANS, type PayMethod, type PlanId } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import type { Env } from '../config/env.js';
import { hasPlus } from '../plus/plus.js';
import { PlusService } from '../plus/plus.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Billing, CheckoutStart } from './billing.schemas.js';
import { StripeGateway, type StripeEvent } from './stripe.gateway.js';

const addMonths = (from: Date, months: number) => {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};
const later = (a: Date, b: Date | null | undefined) => (b && b > a ? b : a);

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
  ) {}

  async view(userId: string, now = new Date()): Promise<Billing> {
    const [user, sub, receipts] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plusUntil: true } }),
      this.prisma.plusSubscription.findUnique({ where: { userId } }),
      this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 24 }),
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
      stripe: this.stripe.enabled,
    };
  }

  /** The payment page's Continue: Stripe's page, or the local stand-in */
  async checkout(userId: string, plan: PlanId, method: PayMethod, now = new Date()): Promise<CheckoutStart> {
    const user = await requireSignedUp(this.prisma, userId);
    const sub = await this.prisma.plusSubscription.findUnique({ where: { userId } });
    if (sub?.renews && hasPlus(user, now)) {
      throw new ConflictException({ code: 'already_plus', message: 'You have Plus already; it renews by itself' });
    }
    const checkout = await this.prisma.checkout.create({ data: { userId, plan, method } });
    if (!this.stripe.enabled) return { checkoutId: checkout.id, url: null };
    const session = await this.stripe.checkout({ checkoutId: checkout.id, plan, method, email: user.email });
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
   * plan on the account. Once only: a second notice finds the checkout paid already.
   */
  async paid(
    checkoutId: string,
    got: { ref: string; customerId?: string | null; subscriptionId?: string | null; periodEnd?: Date | null },
    now = new Date(),
  ) {
    const checkout = await this.prisma.checkout.findUnique({ where: { id: checkoutId }, include: { user: true } });
    if (!checkout) return;
    const plan = PLUS_PLANS[checkout.plan as PlanId];
    const wasPlus = hasPlus(checkout.user, now);
    // A card's period comes from Stripe; otherwise months from today or from the Plus you have left
    const until = later(got.periodEnd ?? addMonths(later(now, checkout.user.plusUntil), plan.months), checkout.user.plusUntil);
    const done = await this.prisma.$transaction(async (tx) => {
      const marked = await tx.checkout.updateMany({ where: { id: checkoutId, status: 'open' }, data: { status: 'paid', paidAt: now } });
      if (!marked.count) return false;
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
      await tx.payment.create({
        data: { userId: checkout.userId, what: `Plus · ${plan.label}`, amount: plan.price, method: checkout.method, ref: got.ref },
      });
      await tx.user.update({ where: { id: checkout.userId }, data: { plusUntil: until } });
      return true;
    });
    if (done) await this.plus.announce(checkout.userId, wasPlus, now);
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
