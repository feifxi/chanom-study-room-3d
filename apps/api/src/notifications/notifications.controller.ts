import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { z } from 'zod';
import { InboxSchema, ReadNotificationsBodySchema, type Inbox } from './notifications.schemas.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('inbox')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** The 🔔 inbox: the newest 50 of the last 30 days, and how many are unread. */
  @Get()
  @ApiOkResponse({ standardSchema: InboxSchema })
  list(@Session() session: UserSession): Promise<Inbox> {
    return this.notifications.list(session.user.id);
  }

  /** Mark items read (opening one), or all of them. */
  @Post('read')
  @HttpCode(204)
  @ApiNoContentResponse()
  async read(
    @Session() session: UserSession,
    @Body({ schema: ReadNotificationsBodySchema }) body: z.infer<typeof ReadNotificationsBodySchema>,
  ): Promise<void> {
    await this.notifications.read(session.user.id, body.ids);
  }
}
