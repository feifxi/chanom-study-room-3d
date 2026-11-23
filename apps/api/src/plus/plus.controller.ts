import { Body, Controller, Get, HttpCode, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { requireSignedUp } from '../accounts/signed-up.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DevPlusBodySchema, PlusStatusSchema, type PlusStatus } from './plus.schemas.js';
import { PlusEndingService } from './plus-ending.service.js';
import { PlusService } from './plus.service.js';

@ApiTags('plus')
@Controller('plus')
export class PlusController {
  constructor(
    private readonly plus: PlusService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly ending: PlusEndingService,
  ) {}

  /** Your Plus: on or off, and until when. */
  @Get()
  @ApiOkResponse({ standardSchema: PlusStatusSchema })
  status(@Session() session: UserSession): Promise<PlusStatus> {
    return this.plus.status(session.user.id);
  }

  /**
   * Local testing only (404 in production): jump to Plus, cancelled, ended (in the grace) or Free;
   * the reminders and the grace's end run at once instead of on the next 10-minute sweep.
   */
  @Post('dev')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: PlusStatusSchema })
  async dev(
    @Session() session: UserSession,
    @Body({ schema: DevPlusBodySchema }) body: z.infer<typeof DevPlusBodySchema>,
  ): Promise<PlusStatus> {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') throw new NotFoundException();
    await requireSignedUp(this.prisma, session.user.id);
    const status = await this.plus.devSet(session.user.id, body.state);
    await this.ending.sweep();
    return status;
  }
}
