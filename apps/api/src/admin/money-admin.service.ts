import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PLUS_PLANS, type PlanId } from '@connecta/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { GUEST_EMAIL_DOMAIN } from '../auth/auth.js';
import { StripeGateway } from '../billing/stripe.gateway.js';
import { refundMail } from '../mail/account-mail.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminMoney, AdminPayment, PAYMENT_FILTERS, REFUND_REASONS } from './admin.schemas.js';
import { requireTeam } from './team.js';

const PAGE = 100;
/** Stripe's rates in Thailand (spec 15; check current rates): cards 3.65% + ฿10, PromptPay 1.65% */
const fee = (method: string, amount: number) => (method === 'card' ? amount * 0.0365 + 10 : amount * 0.0165);
const isGift = (what: string) => what.startsWith('Gift');

/**
 * Money in the admin site (spec 15): what Plus brings in, how people pay, and every payment.
 * Refunds happen only here, by hand, for real mistakes: Stripe gives the money back (the local
 * stand-in only marks it), the person gets an email, and it goes in the audit log. A refund doesn't
 * change their Plus; gifts can't be refunded once received.
 */
@Injectable()
export class MoneyAdminService {
  private readonly log = new Logger(MoneyAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeGateway,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async money(teamId: string, filter: (typeof PAYMENT_FILTERS)[number] = 'all', now = new Date()): Promise<AdminMoney> {
    await requireTeam(this.prisma, teamId);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const where: Prisma.PaymentWhereInput =
      filter === 'refunded' ? { refundedAt: { not: null } } : filter === 'gifts' ? { what: { startsWith: 'Gift' } } : {};
    const [subs, plus, month, payments] = await Promise.all([
      this.prisma.plusSubscription.findMany({
        where: { user: { plusUntil: { gt: now } } },
        select: { plan: true, method: true, renews: true },
      }),
      this.prisma.user.count({ where: { plusUntil: { gt: now } } }),
      this.prisma.payment.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { what: true, amount: true, method: true, refundedAt: true },
      }),
      this.prisma.payment.findMany({ where, include: { user: true }, orderBy: { createdAt: 'desc' }, take: PAGE }),
    ]);
    const refunders = await this.prisma.user.findMany({
      where: { id: { in: payments.map((p) => p.refundedById).filter((id): id is string => !!id) } },
      select: { id: true, name: true },
    });
    const refunder = new Map(refunders.map((u) => [u.id, u.name]));

    // Monthly revenue: the plans that renew, a yearly one spread over 12 months
    const mix = new Map<string, { people: number; mrr: number }>();
    for (const s of subs) {
      const plan = PLUS_PLANS[s.plan as PlanId];
      if (!plan) continue;
      const label = `${plan.label} · ${s.method === 'card' ? 'card' : 'PromptPay'}`;
      const row = mix.get(label) ?? { people: 0, mrr: 0 };
      row.people++;
      if (s.renews) row.mrr += Math.round(plan.price / plan.months);
      mix.set(label, row);
    }
    const mrr = [...mix.values()].reduce((n, r) => n + r.mrr, 0);
    const kept = month.filter((p) => !p.refundedAt);
    const revenue = kept.reduce((n, p) => n + p.amount, 0);
    const fees = Math.round(kept.reduce((n, p) => n + fee(p.method, p.amount), 0));
    const gifts = month.filter((p) => isGift(p.what) && !p.refundedAt);
    const refunded = month.filter((p) => p.refundedAt);
    const baht = (x: number) => `฿${x.toLocaleString('en')}`;
    const viewOf = (p: (typeof payments)[number]): AdminPayment => ({
      id: p.id,
      at: p.createdAt.toISOString(),
      who: p.user && { id: p.user.id, name: p.user.name, handle: p.user.handle },
      what: p.what,
      method: p.method,
      amount: p.amount,
      status: p.refundedAt ? 'refunded' : 'paid',
      refund: p.refundedAt
        ? { reason: p.refundReason ?? '', at: p.refundedAt.toISOString(), by: refunder.get(p.refundedById ?? '') ?? 'Connecta team' }
        : null,
      refundable: !p.refundedAt && !isGift(p.what),
    });
    return {
      stats: [
        { label: 'Monthly revenue (MRR)', value: baht(mrr), note: 'plans that renew, before Stripe fees', warn: false },
        {
          label: 'Plus members',
          value: plus.toLocaleString('en'),
          note: `${subs.filter((s) => s.renews).length} renewing · the rest gifts or cancelled`,
          warn: false,
        },
        {
          label: 'Paid this month',
          value: baht(revenue),
          note: `${kept.length} ${kept.length === 1 ? 'payment' : 'payments'}`,
          warn: false,
        },
        { label: 'Stripe fees this month', value: `≈ ${baht(fees)}`, note: 'cards 3.65% + ฿10, PromptPay 1.65%', warn: false },
        { label: 'Gifts this month', value: String(gifts.length), note: baht(gifts.reduce((n, p) => n + p.amount, 0)), warn: false },
        {
          label: 'Refunds this month',
          value: String(refunded.length),
          note: baht(refunded.reduce((n, p) => n + p.amount, 0)),
          warn: refunded.length > 0,
        },
      ],
      mix: [...mix.entries()].map(([plan, r]) => ({ plan, ...r })).sort((a, b) => b.people - a.people),
      payments: payments.map(viewOf),
      stripe: this.stripe.enabled,
    };
  }

  async refund(teamId: string, paymentId: string, reason: (typeof REFUND_REASONS)[number], now = new Date()): Promise<void> {
    await requireTeam(this.prisma, teamId);
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { user: true } });
    if (!payment) throw new NotFoundException('That payment is gone');
    if (payment.refundedAt) throw new BadRequestException('Already refunded');
    if (isGift(payment.what)) throw new BadRequestException('Gifts can’t be refunded once received');
    // Paid through Stripe: Stripe gives it back first, so a failure leaves nothing half done
    if (!payment.ref.startsWith('local:')) {
      if (!this.stripe.enabled) throw new ServiceUnavailableException('Stripe is off, so a Stripe payment can’t be refunded from here');
      await this.stripe.refund(payment.ref).catch((err: unknown) => {
        this.log.warn(`Refund ${payment.id}: ${String(err)}`);
        throw new ServiceUnavailableException('Stripe didn’t take the refund. Try again, or refund it in the Stripe dashboard.');
      });
    }
    await this.prisma.payment.update({ where: { id: paymentId }, data: { refundedAt: now, refundReason: reason, refundedById: teamId } });
    await this.audit.record({
      by: teamId,
      action: 'payment.refund',
      targetKind: 'user',
      targetId: payment.userId ?? 'gone',
      reason,
      details: { what: payment.what, amount: payment.amount },
    });
    const to = payment.user?.email;
    if (to && !to.endsWith(`@${GUEST_EMAIL_DOMAIN}`)) await this.mail.deliver(refundMail(to, payment.what, payment.amount, reason));
  }
}
