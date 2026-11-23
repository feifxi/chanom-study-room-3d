import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { CommonRoomSchema, CommonTicketBodySchema, CommonTicketSchema, type CommonRoomView, type CommonTicket } from './common.schemas.js';
import { CommonService } from './common.service.js';

@ApiTags('common')
@Controller('common')
export class CommonController {
  constructor(private readonly common: CommonService) {}

  /** The Common room types: how many are inside now and which of your friends. Guests too. */
  @Get()
  @ApiOkResponse({ standardSchema: z.array(CommonRoomSchema) })
  list(@Session() session: UserSession): Promise<CommonRoomView[]> {
    return this.common.list(session.user.id);
  }

  /** Walk into a Common room: your copy (a friend's, the busiest with space, or a new one) and its ticket. */
  @Post(':type/ticket')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: CommonTicketSchema })
  ticket(
    @Session() session: UserSession,
    @Param('type', { schema: z.string().max(20) }) type: string,
    @Body({ schema: CommonTicketBodySchema }) body: z.infer<typeof CommonTicketBodySchema>,
  ): Promise<CommonTicket> {
    return this.common.ticket(session.user.id, type, body);
  }
}
