import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ROOM_LANGUAGES, ROOM_TAGS } from '@connecta/shared';
import { AllowAnonymous, OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { z } from 'zod';
import {
  AskBodySchema,
  BanBodySchema,
  BanSchema,
  CreateRoomBodySchema,
  DeleteRoomBodySchema,
  DiscoverQuerySchema,
  InviteSchema,
  JoinRequestSchema,
  ListedRoomSchema,
  MakeInviteBodySchema,
  MemberSchema,
  MyPlaceBodySchema,
  RoleBodySchema,
  RoomSchema,
  RoomSettingsBodySchema,
  ThumbnailBodySchema,
  ThumbnailSchema,
  TicketSchema,
  TimeoutBodySchema,
  TransferBodySchema,
  type Ban,
  type InviteView,
  type JoinRequestView,
  type ListedRoom,
  type Member,
  type Room,
} from './rooms.schemas.js';
import type { Ticket } from './rooms.schemas.js';
import { RoomsService } from './rooms.service.js';
import { ThumbnailService } from './thumbnail.service.js';

const Id = { schema: z.string().max(40) };

/** Rooms: your own, their settings, members and roles, requests, bans and invite links. */
@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly thumbnails: ThumbnailService,
  ) {}

  /** Home: the rooms you're a member of. */
  @Get()
  @ApiOkResponse({ standardSchema: z.array(RoomSchema) })
  mine(@Session() session: UserSession): Promise<Room[]> {
    return this.rooms.mine(session.user.id);
  }

  /** Make a room: a name and a template. Everything else starts at a sensible default. */
  @Post()
  @ApiCreatedResponse({ standardSchema: RoomSchema })
  @ApiConflictResponse({ description: 'too_many_rooms' })
  make(@Session() session: UserSession, @Body({ schema: CreateRoomBodySchema }) body: z.infer<typeof CreateRoomBodySchema>): Promise<Room> {
    return this.rooms.make(session.user.id, body);
  }

  /** Discover: listed rooms (Ask to join and Open), signed in or not. Declared before :id so "listed" isn't read as an id. */
  @Get('listed')
  @OptionalAuth()
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, enum: ROOM_TAGS })
  @ApiQuery({ name: 'language', required: false, enum: ROOM_LANGUAGES })
  @ApiOkResponse({ standardSchema: z.array(ListedRoomSchema) })
  listed(
    @Session() session: UserSession | null,
    @Query({ schema: DiscoverQuerySchema }) query: z.infer<typeof DiscoverQuerySchema>,
  ): Promise<ListedRoom[]> {
    return this.rooms.listed(session?.user.id ?? null, query);
  }

  /** A room: for members, for anyone when it's listed, or for a guest pass holder. 404 otherwise. */
  @Get(':id')
  @ApiOkResponse({ standardSchema: RoomSchema })
  get(@Session() session: UserSession, @Param('id', Id) id: string): Promise<Room> {
    return this.rooms.get(id, session.user.id);
  }

  /** Room settings. The owner changes anything; mods only the invite and safety settings. */
  @Patch(':id')
  @ApiOkResponse({ standardSchema: RoomSchema })
  update(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: RoomSettingsBodySchema }) body: z.infer<typeof RoomSettingsBodySchema>,
  ): Promise<Room> {
    return this.rooms.update(id, session.user.id, body);
  }

  /** Deletes the room for everyone. Owner only, confirmed by typing its name. */
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: DeleteRoomBodySchema }) body: z.infer<typeof DeleteRoomBodySchema>,
  ): Promise<void> {
    return this.rooms.remove(id, session.user.id, body.name);
  }

  /** The room's thumbnail, for anyone (Discover and invite pages show it). */
  @Get(':id/thumbnail')
  @AllowAnonymous()
  @ApiFoundResponse({ description: 'Redirects to a short-lived link to the WebP' })
  async thumbnail(@Param('id', Id) id: string, @Res() res: Response) {
    const link = await this.thumbnails.open(id);
    // Shorter than the link's hour; the ?v= in the room's link changes with each new picture
    res.setHeader('Cache-Control', 'public, max-age=3000');
    res.redirect(302, link);
  }

  /** The owner sets the thumbnail from an upload (checked first: 400 flagged). */
  @Put(':id/thumbnail')
  @ApiOkResponse({ standardSchema: ThumbnailSchema })
  async setThumbnail(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: ThumbnailBodySchema }) body: z.infer<typeof ThumbnailBodySchema>,
  ): Promise<z.infer<typeof ThumbnailSchema>> {
    return { thumbnail: await this.thumbnails.set(id, session.user.id, body.pictureId) };
  }

  /** Back to the map's picture. */
  @Delete(':id/thumbnail')
  @HttpCode(204)
  @ApiNoContentResponse()
  clearThumbnail(@Session() session: UserSession, @Param('id', Id) id: string): Promise<void> {
    return this.thumbnails.clear(id, session.user.id);
  }

  /** Hands the room to another member; you stay on as a mod. */
  @Put(':id/owner')
  @ApiOkResponse({ standardSchema: RoomSchema })
  transfer(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: TransferBodySchema }) body: z.infer<typeof TransferBodySchema>,
  ): Promise<Room> {
    return this.rooms.transfer(id, session.user.id, body.userId);
  }

  /** Your own place in the room: pinned on Home, which messages notify you. */
  @Patch(':id/me')
  @ApiOkResponse({ standardSchema: RoomSchema })
  myPlace(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: MyPlaceBodySchema }) body: z.infer<typeof MyPlaceBodySchema>,
  ): Promise<Room> {
    return this.rooms.updateMyPlace(id, session.user.id, body);
  }

  /** Opened the room (its page or walking in), for Home's order. */
  @Put(':id/visit')
  @HttpCode(204)
  @ApiNoContentResponse()
  visit(@Session() session: UserSession, @Param('id', Id) id: string): Promise<void> {
    return this.rooms.visit(id, session.user.id);
  }

  /** A one-minute pass into the room's game server (walking in, 3D). */
  @Post(':id/ticket')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: TicketSchema })
  ticket(@Session() session: UserSession, @Param('id', Id) id: string): Promise<Ticket> {
    return this.rooms.ticket(id, session.user.id);
  }

  /** The room is full: a 🔔 item when someone leaves. */
  @Post(':id/space')
  @HttpCode(204)
  @ApiNoContentResponse()
  notifyWhenSpace(@Session() session: UserSession, @Param('id', Id) id: string): Promise<void> {
    return this.rooms.notifyWhenSpace(id, session.user.id);
  }

  /** Join an Open room. */
  @Post(':id/join')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: RoomSchema })
  join(@Session() session: UserSession, @Param('id', Id) id: string): Promise<Room> {
    return this.rooms.join(id, session.user.id);
  }

  /** Leave. The owner hands the room over or deletes it first (409 owner_leaves). */
  @Delete(':id/me')
  @HttpCode(204)
  @ApiNoContentResponse()
  leave(@Session() session: UserSession, @Param('id', Id) id: string): Promise<void> {
    return this.rooms.leave(id, session.user.id);
  }

  /** Ask to join, with an optional note. 409 too_soon within 7 days of a decline. */
  @Post(':id/requests')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: RoomSchema })
  ask(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: AskBodySchema }) body: z.infer<typeof AskBodySchema>,
  ): Promise<Room> {
    return this.rooms.ask(id, session.user.id, body.note);
  }

  @Get(':id/requests')
  @ApiOkResponse({ standardSchema: z.array(JoinRequestSchema) })
  requests(@Session() session: UserSession, @Param('id', Id) id: string): Promise<JoinRequestView[]> {
    return this.rooms.requests(id, session.user.id);
  }

  @Post(':id/requests/:userId/accept')
  @HttpCode(204)
  @ApiNoContentResponse()
  letIn(@Session() session: UserSession, @Param('id', Id) id: string, @Param('userId', Id) userId: string): Promise<void> {
    return this.rooms.decide(id, session.user.id, userId, true);
  }

  @Post(':id/requests/:userId/decline')
  @HttpCode(204)
  @ApiNoContentResponse()
  decline(@Session() session: UserSession, @Param('id', Id) id: string, @Param('userId', Id) userId: string): Promise<void> {
    return this.rooms.decide(id, session.user.id, userId, false);
  }

  @Get(':id/members')
  @ApiOkResponse({ standardSchema: z.array(MemberSchema) })
  members(@Session() session: UserSession, @Param('id', Id) id: string): Promise<Member[]> {
    return this.rooms.members(id, session.user.id);
  }

  /** Make or remove a mod (owner only). */
  @Put(':id/members/:userId/role')
  @HttpCode(204)
  @ApiNoContentResponse()
  role(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Param('userId', Id) userId: string,
    @Body({ schema: RoleBodySchema }) body: z.infer<typeof RoleBodySchema>,
  ): Promise<void> {
    return this.rooms.setRole(id, session.user.id, userId, body.role);
  }

  @Put(':id/members/:userId/timeout')
  @HttpCode(204)
  @ApiNoContentResponse()
  timeOut(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Param('userId', Id) userId: string,
    @Body({ schema: TimeoutBodySchema }) body: z.infer<typeof TimeoutBodySchema>,
  ): Promise<void> {
    return this.rooms.timeOut(id, session.user.id, userId, body.duration);
  }

  /** Kick: out of the room and its membership; a new invite brings them back. */
  @Delete(':id/members/:userId')
  @HttpCode(204)
  @ApiNoContentResponse()
  kick(@Session() session: UserSession, @Param('id', Id) id: string, @Param('userId', Id) userId: string): Promise<void> {
    return this.rooms.kick(id, session.user.id, userId);
  }

  @Get(':id/bans')
  @ApiOkResponse({ standardSchema: z.array(BanSchema) })
  bans(@Session() session: UserSession, @Param('id', Id) id: string): Promise<Ban[]> {
    return this.rooms.bans(id, session.user.id);
  }

  @Put(':id/bans/:userId')
  @HttpCode(204)
  @ApiNoContentResponse()
  ban(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Param('userId', Id) userId: string,
    @Body({ schema: BanBodySchema }) body: z.infer<typeof BanBodySchema>,
  ): Promise<void> {
    return this.rooms.ban(id, session.user.id, userId, body.reason);
  }

  @Delete(':id/bans/:userId')
  @HttpCode(204)
  @ApiNoContentResponse()
  unban(@Session() session: UserSession, @Param('id', Id) id: string, @Param('userId', Id) userId: string): Promise<void> {
    return this.rooms.unban(id, session.user.id, userId);
  }

  /** Your invite link: the same one back while at least half its time is left, unless `fresh`. */
  @Post(':id/invites')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: InviteSchema })
  makeInvite(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: MakeInviteBodySchema }) body: z.infer<typeof MakeInviteBodySchema>,
  ): Promise<InviteView> {
    return this.rooms.makeInvite(id, session.user.id, body);
  }

  /** Room settings → Invites: the links that still work (owner and mods). */
  @Get(':id/invites')
  @ApiOkResponse({ standardSchema: z.array(InviteSchema) })
  invites(@Session() session: UserSession, @Param('id', Id) id: string): Promise<InviteView[]> {
    return this.rooms.invites(id, session.user.id);
  }
}
