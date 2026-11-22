import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import {
  ChatMessageSchema,
  EditMessageBodySchema,
  MessagePageQuerySchema,
  MessagePageSchema,
  ReactionBodySchema,
  ReadBodySchema,
  SendMessageBodySchema,
  type ChatMessage,
  type MessagePage,
} from './chat.schemas.js';
import { ChatService } from './chat.service.js';

const Id = { schema: z.string().max(40) };

/** Room chat. New and changed messages also go out live through the gateway (/live). */
@ApiTags('chat')
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** The newest page, or older ones with `before`. */
  @Get('rooms/:id/messages')
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ standardSchema: MessagePageSchema })
  page(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Query({ schema: MessagePageQuerySchema }) query: z.infer<typeof MessagePageQuerySchema>,
  ): Promise<MessagePage> {
    return this.chat.page(session.user.id, id, query.before, query.limit);
  }

  @Post('rooms/:id/messages')
  @ApiCreatedResponse({ standardSchema: ChatMessageSchema })
  @ApiForbiddenResponse({ description: 'timed_out' })
  send(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: SendMessageBodySchema }) body: z.infer<typeof SendMessageBodySchema>,
  ): Promise<ChatMessage> {
    return this.chat.send(session.user.id, id, body);
  }

  /** You've read up to this message ("New messages" and unread counts start after it). */
  @Put('rooms/:id/read')
  @HttpCode(204)
  @ApiNoContentResponse()
  read(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: ReadBodySchema }) body: z.infer<typeof ReadBodySchema>,
  ) {
    return this.chat.read(session.user.id, id, body.messageId);
  }

  @Patch('messages/:messageId')
  @ApiOkResponse({ standardSchema: ChatMessageSchema })
  edit(
    @Session() session: UserSession,
    @Param('messageId', Id) messageId: string,
    @Body({ schema: EditMessageBodySchema }) body: z.infer<typeof EditMessageBodySchema>,
  ): Promise<ChatMessage> {
    return this.chat.edit(session.user.id, messageId, body.text);
  }

  @Delete('messages/:messageId')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Session() session: UserSession, @Param('messageId', Id) messageId: string): Promise<void> {
    return this.chat.remove(session.user.id, messageId);
  }

  @Put('messages/:messageId/reactions')
  @ApiOkResponse({ standardSchema: ChatMessageSchema })
  react(
    @Session() session: UserSession,
    @Param('messageId', Id) messageId: string,
    @Body({ schema: ReactionBodySchema }) body: z.infer<typeof ReactionBodySchema>,
  ): Promise<ChatMessage> {
    return this.chat.react(session.user.id, messageId, body.emoji, true);
  }

  @Delete('messages/:messageId/reactions')
  @ApiOkResponse({ standardSchema: ChatMessageSchema })
  unreact(
    @Session() session: UserSession,
    @Param('messageId', Id) messageId: string,
    @Body({ schema: ReactionBodySchema }) body: z.infer<typeof ReactionBodySchema>,
  ): Promise<ChatMessage> {
    return this.chat.react(session.user.id, messageId, body.emoji, false);
  }
}
