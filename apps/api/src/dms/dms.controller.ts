import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import {
  ChatMessageSchema,
  MessagePageQuerySchema,
  MessagePageSchema,
  ReadBodySchema,
  SendMessageBodySchema,
  type ChatMessage,
  type MessagePage,
} from '../chat/chat.schemas.js';
import {
  AnswerAskBodySchema,
  DmOpenSchema,
  DmSummarySchema,
  InviteToRoomBodySchema,
  MuteBodySchema,
  type DmOpen,
  type DmSummary,
} from './dms.schemas.js';
import { DmsService } from './dms.service.js';

const Id = { schema: z.string().max(40) };
const Handle = { schema: z.string().max(40) };

/**
 * DMs. Editing, deleting and reacting use the same /api/messages/:id routes as room chat; new and
 * changed messages go out live to both people.
 */
@ApiTags('dms')
@Controller('dms')
export class DmsController {
  constructor(private readonly dms: DmsService) {}

  @Get()
  @ApiOkResponse({ standardSchema: z.array(DmSummarySchema) })
  list(@Session() session: UserSession): Promise<DmSummary[]> {
    return this.dms.list(session.user.id);
  }

  /** Your chat with someone: made on first open if you're friends (it stays out of lists until a message). */
  @Put('with/:handle')
  @ApiOkResponse({ standardSchema: DmOpenSchema })
  open(@Session() session: UserSession, @Param('handle', Handle) handle: string): Promise<DmOpen> {
    return this.dms.open(session.user.id, handle);
  }

  /** Ask a friend to let you into the room they're in (a card in your DM). */
  @Post('with/:handle/ask')
  @ApiCreatedResponse({ standardSchema: ChatMessageSchema })
  ask(@Session() session: UserSession, @Param('handle', Handle) handle: string): Promise<ChatMessage> {
    return this.dms.askToJoin(session.user.id, handle);
  }

  /** Send a friend a link to one of your rooms (a card in your DM). */
  @Post('with/:handle/invite')
  @ApiCreatedResponse({ standardSchema: ChatMessageSchema })
  invite(
    @Session() session: UserSession,
    @Param('handle', Handle) handle: string,
    @Body({ schema: InviteToRoomBodySchema }) body: z.infer<typeof InviteToRoomBodySchema>,
  ): Promise<ChatMessage> {
    return this.dms.invite(session.user.id, handle, body.roomId);
  }

  /** Answer an ask sent to you: Send invite or Not now. Returns the updated ask. */
  @Post('asks/:messageId')
  @ApiCreatedResponse({ standardSchema: ChatMessageSchema })
  answer(
    @Session() session: UserSession,
    @Param('messageId', Id) messageId: string,
    @Body({ schema: AnswerAskBodySchema }) body: z.infer<typeof AnswerAskBodySchema>,
  ): Promise<ChatMessage> {
    return this.dms.answer(session.user.id, messageId, body.send);
  }

  @Get(':id/messages')
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ standardSchema: MessagePageSchema })
  page(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Query({ schema: MessagePageQuerySchema }) query: z.infer<typeof MessagePageQuerySchema>,
  ): Promise<MessagePage> {
    return this.dms.page(session.user.id, id, query.before, query.limit);
  }

  @Post(':id/messages')
  @ApiCreatedResponse({ standardSchema: ChatMessageSchema })
  @ApiForbiddenResponse({ description: 'not_friends' })
  send(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: SendMessageBodySchema }) body: z.infer<typeof SendMessageBodySchema>,
  ): Promise<ChatMessage> {
    return this.dms.send(session.user.id, id, body);
  }

  /** Mute or unmute this chat (yours alone). */
  @Put(':id/mute')
  @HttpCode(204)
  @ApiNoContentResponse()
  mute(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: MuteBodySchema }) body: z.infer<typeof MuteBodySchema>,
  ) {
    return this.dms.mute(session.user.id, id, body.muted);
  }

  @Put(':id/read')
  @HttpCode(204)
  @ApiNoContentResponse()
  read(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: ReadBodySchema }) body: z.infer<typeof ReadBodySchema>,
  ) {
    return this.dms.read(session.user.id, id, body.messageId);
  }
}
