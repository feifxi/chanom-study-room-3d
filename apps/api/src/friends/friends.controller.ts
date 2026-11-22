import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import {
  AddFriendBodySchema,
  AddFriendResultSchema,
  BlockedSchema,
  FriendRequestsSchema,
  FriendSchema,
  type AddFriendResult,
  type Blocked,
  type Friend,
  type FriendRequests,
} from './friends.schemas.js';
import { FriendsService } from './friends.service.js';

const Id = { schema: z.string().max(40) };

/** Friends, friend requests and blocks. Declining, ignoring and removing tell nobody. */
@ApiTags('friends')
@Controller()
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get('friends')
  @ApiOkResponse({ standardSchema: z.array(FriendSchema) })
  list(@Session() session: UserSession): Promise<Friend[]> {
    return this.friends.list(session.user.id);
  }

  /** Remove a friend, silently. */
  @Delete('friends/:userId')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Session() session: UserSession, @Param('userId', Id) userId: string): Promise<void> {
    return this.friends.remove(session.user.id, userId);
  }

  @Get('friends/requests')
  @ApiOkResponse({ standardSchema: FriendRequestsSchema })
  requests(@Session() session: UserSession): Promise<FriendRequests> {
    return this.friends.requests(session.user.id);
  }

  /**
   * Send a request by exact @handle (the Add friend dialog, a room's people list, a friend link).
   * Rate-limited so nobody can try handles to find out who's on Connecta.
   */
  @Post('friends/requests')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ standardSchema: AddFriendResultSchema })
  @ApiConflictResponse({ description: 'already_friends' })
  add(
    @Session() session: UserSession,
    @Body({ schema: AddFriendBodySchema }) body: z.infer<typeof AddFriendBodySchema>,
  ): Promise<AddFriendResult> {
    return this.friends.add(session.user.id, body.handle);
  }

  @Post('friends/requests/:userId/accept')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: FriendSchema })
  accept(@Session() session: UserSession, @Param('userId', Id) userId: string): Promise<Friend> {
    return this.friends.accept(session.user.id, userId);
  }

  /** Ignore a request to you; they keep seeing "Pending". */
  @Post('friends/requests/:userId/ignore')
  @HttpCode(204)
  @ApiNoContentResponse()
  ignore(@Session() session: UserSession, @Param('userId', Id) userId: string): Promise<void> {
    return this.friends.ignore(session.user.id, userId);
  }

  /** Cancel a request you sent. */
  @Delete('friends/requests/:userId')
  @HttpCode(204)
  @ApiNoContentResponse()
  cancel(@Session() session: UserSession, @Param('userId', Id) userId: string): Promise<void> {
    return this.friends.cancel(session.user.id, userId);
  }

  @Get('blocks')
  @ApiOkResponse({ standardSchema: z.array(BlockedSchema) })
  blocks(@Session() session: UserSession): Promise<Blocked[]> {
    return this.friends.blocks(session.user.id);
  }

  @Put('blocks/:userId')
  @HttpCode(204)
  @ApiNoContentResponse()
  block(@Session() session: UserSession, @Param('userId', Id) userId: string): Promise<void> {
    return this.friends.block(session.user.id, userId);
  }

  @Delete('blocks/:userId')
  @HttpCode(204)
  @ApiNoContentResponse()
  unblock(@Session() session: UserSession, @Param('userId', Id) userId: string): Promise<void> {
    return this.friends.unblock(session.user.id, userId);
  }
}
