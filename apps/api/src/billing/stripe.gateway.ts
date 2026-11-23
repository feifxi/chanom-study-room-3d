import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PLUS_PLANS, type PayMethod, type PlanId } from '@connecta/shared';
import type { Env } from '../config/env.js';

/** What the API needs from Stripe; tests swap in a fake (nothing leaves the machine) */
export interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Stripe (spec 15, "Paying"): its hosted Checkout, so we never see card details, and its signed
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
