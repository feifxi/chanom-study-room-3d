import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { HandleCheckSchema, type HandleCheck } from './accounts.schemas.js';
import { HandlesService } from './handles.service.js';

@ApiTags('handles')
@Controller('handles')
@UseGuards(ThrottlerGuard)
export class HandlesController {
  constructor(private readonly handles: HandlesService) {}

  /** "Is this @handle free?", asked as you type. Signed-in only and rate-limited, so it can't be used to list who's here. */
  @Get(':handle')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOkResponse({ standardSchema: HandleCheckSchema })
  check(@Session() session: UserSession, @Param('handle', { schema: z.string().max(40) }) handle: string): Promise<HandleCheck> {
    return this.handles.check(handle, session.user.id);
  }
}
