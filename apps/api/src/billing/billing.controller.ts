import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { z } from 'zod';
import type { PayMethod, PlanId } from '@connecta/shared';
import {
  BillingSchema,
  CheckoutBodySchema,
  CheckoutStartSchema,
  GiftBodySchema,
  type Billing,
  type CheckoutStart,
  type GiftBody,
} from './billing.schemas.js';
import { BillingService } from './billing.service.js';
import { StripeGateway } from './stripe.gateway.js';

const Id = { schema: z.string().max(40) };

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeGateway,
  ) {}

  /** Your plan, its date, whether it renews, and your receipts. */
  @Get()
  @ApiOkResponse({ standardSchema: BillingSchema })
  view(@Session() session: UserSession): Promise<Billing> {
    return this.billing.view(session.user.id);
  }

  /** Start paying for Plus: Stripe's payment page, or null for the local stand-in (409 already_plus). */
  @Post('checkout')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: CheckoutStartSchema })
  checkout(
    @Session() session: UserSession,
    @Body({ schema: CheckoutBodySchema }) body: z.infer<typeof CheckoutBodySchema>,
  ): Promise<CheckoutStart> {
    return this.billing.checkout(session.user.id, body.plan as PlanId, body.method as PayMethod);
  }

  /** Gift Plus to a friend: Stripe's payment page, or null for the local stand-in (403 not_friends). */
  @Post('gift')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: CheckoutStartSchema })
  gift(@Session() session: UserSession, @Body({ schema: GiftBodySchema }) body: GiftBody): Promise<CheckoutStart> {
    return this.billing.gift(session.user.id, body);
  }

  /** The local stand-in's Pay (404 in production and when Stripe is on). */
  @Post('checkout/:id/dev-pay')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: BillingSchema })
  devPay(@Session() session: UserSession, @Param('id', Id) id: string): Promise<Billing> {
    return this.billing.devPay(session.user.id, id);
  }

  /** Cancel Plus: it runs to the date, then ends. */
  @Post('cancel')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: BillingSchema })
  cancel(@Session() session: UserSession): Promise<Billing> {
    return this.billing.cancel(session.user.id);
  }

  /** Keep renewing (while Plus is still running). */
  @Post('resume')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: BillingSchema })
  resume(@Session() session: UserSession): Promise<Billing> {
    return this.billing.resume(session.user.id);
  }

  /** Stripe's notices. No session: the signature is the proof. */
  @Post('stripe-webhook')
  @HttpCode(200)
  @AllowAnonymous()
  @ApiExcludeEndpoint()
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    if (!this.stripe.enabled) throw new NotFoundException();
    if (!req.rawBody || !signature) throw new BadRequestException('Not a Stripe notice');
    let event;
    try {
      event = this.stripe.event(req.rawBody, signature);
    } catch {
      throw new BadRequestException('Bad signature');
    }
    await this.billing.stripeEvent(event);
    return { received: true };
  }
}
