import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PLUS_PLANS, type PayMethod, type PlanId } from '@connecta/shared';

/** A gift is paid once, whatever the method */
export interface GiftCheckout {
  checkoutId: string;
  months: number;
  price: number;
  method: PayMethod;
  email: string | null;
  /** Where Stripe sends you back: your DM with the friend */
  back: string;
}
import type { Env } from '../config/env.js';

/** What the API needs from Stripe; tests swap in a fake (nothing leaves the machine) */
export interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Stripe (docs/features/15-plus.md, "Paying"): its hosted Checkout, so we never see card details, and its signed
 * webhook telling us what happened. Off when STRIPE_SECRET_KEY is unset: the payment page is then a
 * local stand-in (`BillingService.devPay`).
 */
@Injectable()
export class StripeGateway {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | undefined;
  private readonly web: string;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('STRIPE_SECRET_KEY', { infer: true });
    this.stripe = key ? new Stripe(key) : null;
    this.webhookSecret = config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    this.web = config.get('WEB_ORIGIN', { infer: true });
  }

  get enabled() {
    return !!this.stripe;
  }

  /**
   * Stripe's payment page for a plan. A card subscribes (renews by itself); PromptPay pays once for
   * the period, since nobody can be charged by PromptPay without scanning.
   */
  async checkout(input: {
    checkoutId: string;
    plan: PlanId;
    method: PayMethod;
    email: string | null;
  }): Promise<{ id: string; url: string }> {
    const stripe = this.need();
    const plan = PLUS_PLANS[input.plan];
    const price = {
      currency: 'thb',
      unit_amount: plan.price * 100,
      product_data: { name: `Connecta Plus · ${plan.label}` },
    };
    const session = await stripe.checkout.sessions.create({
      client_reference_id: input.checkoutId,
      metadata: { checkoutId: input.checkoutId },
      customer_email: input.email ?? undefined,
      allowed_payment_method_types: [input.method],
      ...(input.method === 'card'
        ? {
            mode: 'subscription' as const,
            line_items: [
              {
                quantity: 1,
                price_data: { ...price, recurring: { interval: plan.months === 12 ? ('year' as const) : ('month' as const) } },
              },
            ],
          }
        : { mode: 'payment' as const, line_items: [{ quantity: 1, price_data: price }] }),
      success_url: `${this.web}/home/plus?paid=1`,
      cancel_url: `${this.web}/checkout?plan=${input.plan}`,
    });
    if (!session.url) throw new Error('Stripe gave no checkout link');
    return { id: session.id, url: session.url };
  }

  /** Stripe's payment page for Gift Plus: one payment, card or PromptPay */
  async giftCheckout(input: GiftCheckout): Promise<{ id: string; url: string }> {
    const session = await this.need().checkout.sessions.create({
      client_reference_id: input.checkoutId,
      metadata: { checkoutId: input.checkoutId },
      customer_email: input.email ?? undefined,
      allowed_payment_method_types: [input.method],
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'thb',
            unit_amount: input.price * 100,
            product_data: { name: `Connecta Plus gift · ${input.months} month${input.months > 1 ? 's' : ''}` },
          },
        },
      ],
      success_url: `${this.web}${input.back}`,
      cancel_url: `${this.web}/home/friends`,
    });
    if (!session.url) throw new Error('Stripe gave no checkout link');
    return { id: session.id, url: session.url };
  }

  /**
   * A gift moved a card plan's date on: the card's next charge moves with it (a free stretch until
   * then, so nothing is charged or refunded now)
   */
  async moveRenewal(subscriptionId: string, to: Date) {
    await this.need().subscriptions.update(subscriptionId, { trial_end: Math.floor(to.getTime() / 1000), proration_behavior: 'none' });
  }

  /** Stripe's own billing page, where a card subscriber changes their card (and sees Stripe's invoices) */
  async portal(customerId: string): Promise<string> {
    const session = await this.need().billingPortal.sessions.create({ customer: customerId, return_url: `${this.web}/home/plus` });
    return session.url;
  }

  /** When a subscription's paid period ends (it's on the subscription's item) */
  async periodEnd(subscriptionId: string): Promise<Date | null> {
    const sub = await this.need().subscriptions.retrieve(subscriptionId);
    const end = sub.items.data[0]?.current_period_end;
    return end ? new Date(end * 1000) : null;
  }

  /** Cancel (true) or keep renewing (false) at the end of the paid period */
  async cancelAtPeriodEnd(subscriptionId: string, cancel: boolean) {
    await this.need().subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });
  }

  /**
   * Gives a payment back (admin site → Money). The payment's ref is a checkout session (a first
   * payment, or PromptPay) or an invoice (a card renewal); the refund goes to what was charged.
   */
  async refund(ref: string) {
    const stripe = this.need();
    let invoice: string | null = ref.startsWith('in_') ? ref : null;
    let intent: string | null = null;
    if (ref.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(ref);
      intent = idOf(session.payment_intent);
      invoice = intent ? null : idOf(session.invoice);
    }
    let charge: string | null = null;
    if (invoice) {
      const paid = (await stripe.invoicePayments.list({ invoice, status: 'paid', limit: 1 })).data[0];
      intent = idOf(paid?.payment.payment_intent);
      charge = idOf(paid?.payment.charge);
    }
    if (!intent && !charge) throw new Error(`Nothing to refund for ${ref}`);
    await stripe.refunds.create(intent ? { payment_intent: intent } : { charge: charge! });
  }

  /** Checks the webhook's signature (a forged notice throws) */
  event(raw: Buffer, signature: string): StripeEvent {
    if (!this.webhookSecret) throw new Error('No STRIPE_WEBHOOK_SECRET');
    return this.need().webhooks.constructEvent(raw, signature, this.webhookSecret) as unknown as StripeEvent;
  }

  private need() {
    if (!this.stripe) throw new Error('Stripe is off (no STRIPE_SECRET_KEY)');
    return this.stripe;
  }
}

/** Stripe fields hold an id or the expanded object */
const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : (v?.id ?? null));
