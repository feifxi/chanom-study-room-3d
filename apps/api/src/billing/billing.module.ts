import { Module } from '@nestjs/common';
import { DmsModule } from '../dms/dms.module.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { StripeGateway } from './stripe.gateway.js';

/** Paying for Plus with Stripe (docs/features/15-plus.md); a local stand-in when Stripe's keys aren't set. */
@Module({ imports: [DmsModule], controllers: [BillingController], providers: [BillingService, StripeGateway], exports: [StripeGateway] })
export class BillingModule {}
