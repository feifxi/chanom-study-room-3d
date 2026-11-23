import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { StripeGateway } from './stripe.gateway.js';

/** Paying for Plus with Stripe (spec 15); a local stand-in when Stripe's keys aren't set. */
@Module({ controllers: [BillingController], providers: [BillingService, StripeGateway] })
export class BillingModule {}
