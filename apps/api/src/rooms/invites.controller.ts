import { Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { AcceptedSchema, InvitePreviewSchema, type InvitePreview } from './rooms.schemas.js';
import { RoomsService } from './rooms.service.js';

const Code = { schema: z.string().max(16) };

/** Invite links (/i/<code>) and guest passes (/g/<code>). Opening one is rate-limited, so codes can't be guessed. */
@ApiTags('invites')
@Controller('invites')
@UseGuards(ThrottlerGuard)
export class InvitesController {
  constructor(private readonly rooms: RoomsService) {}

  /** What the link shows, signed in or not. 404 once it's cancelled or expired. */
  @Get(':code')
  @OptionalAuth()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ standardSchema: InvitePreviewSchema })
  preview(@Session() session: UserSession | null, @Param('code', Code) code: string): Promise<InvitePreview> {
    return this.rooms.preview(code, session?.user.id ?? null);
  }

  /** Use it: a member invite joins the room (accounts only); a guest pass lets you walk in until it runs out. */
  @Post(':code/accept')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ standardSchema: AcceptedSchema })
  accept(@Session() session: UserSession, @Param('code', Code) code: string) {
    return this.rooms.accept(code, session.user.id);
  }

  /** Stops the link working (the owner and mods, or whoever made it). */
  @Delete(':code')
  @HttpCode(204)
  @ApiNoContentResponse()
  cancel(@Session() session: UserSession, @Param('code', Code) code: string): Promise<void> {
    return this.rooms.cancelInvite(code, session.user.id);
  }
}
