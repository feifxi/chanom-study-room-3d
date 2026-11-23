import { Body, Controller, Get, HttpCode, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { requireSignedUp } from '../accounts/signed-up.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DevPlusBodySchema, PlusStatusSchema, type PlusStatus } from './plus.schemas.js';
import { PlusService } from './plus.service.js';

@ApiTags('plus')
@Controller('plus')
export class PlusController {
  constructor(
    private readonly plus: PlusService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Your Plus: on or off, and until when. */
  @Get()
  @ApiOkResponse({ standardSchema: PlusStatusSchema })
  status(@Session() session: UserSession): Promise<PlusStatus> {
    return this.plus.status(session.user.id);
  }

  /** Local testing only (404 in production): Plus on for a month, or off. Paying comes with Stripe. */
  @Post('dev')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: PlusStatusSchema })
  async dev(
    @Session() session: UserSession,
    @Body({ schema: DevPlusBodySchema }) body: z.infer<typeof DevPlusBodySchema>,
  ): Promise<PlusStatus> {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') throw new NotFoundException();
    await requireSignedUp(this.prisma, session.user.id);
    return this.plus.devSet(session.user.id, body.on);
  }
}
