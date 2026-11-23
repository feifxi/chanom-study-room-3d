import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { DeckBodySchema, DeckPassSchema, RoomDeckSchema, RoomDecksSchema, type DeckBody, type RoomDeck } from './decks.schemas.js';
import { DecksService } from './decks.service.js';

const Id = { schema: z.string().max(40) };

/** Pick a Side's room decks: the room's own questions, for whoever hosts there. */
@ApiTags('decks')
@Controller()
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  /** The room's decks, newest first (members and guests with a pass). */
  @Get('rooms/:id/decks')
  @ApiOkResponse({ standardSchema: RoomDecksSchema })
  list(@Session() session: UserSession, @Param('id', Id) id: string): Promise<RoomDeck[]> {
    return this.decks.list(id, session.user.id);
  }

  /** A new deck in this room (members; 409 too_many past the room's limit). */
  @Post('rooms/:id/decks')
  @ApiOkResponse({ standardSchema: RoomDeckSchema })
  @ApiConflictResponse()
  create(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: DeckBodySchema }) body: DeckBody,
  ): Promise<RoomDeck> {
    return this.decks.create(id, session.user.id, body);
  }

  /** Change a deck you wrote. */
  @Patch('decks/:id')
  @ApiOkResponse({ standardSchema: RoomDeckSchema })
  update(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: DeckBodySchema }) body: DeckBody,
  ): Promise<RoomDeck> {
    return this.decks.update(id, session.user.id, body);
  }

  /** Delete a deck: yours, or any as the owner or a mod. */
  @Delete('decks/:id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Session() session: UserSession, @Param('id', Id) id: string): Promise<void> {
    return this.decks.remove(id, session.user.id);
  }

  /** A signed pass the host's page hands to the game server to play this deck. */
  @Post('decks/:id/pass')
  @ApiOkResponse({ standardSchema: DeckPassSchema })
  pass(@Session() session: UserSession, @Param('id', Id) id: string): Promise<{ pass: string }> {
    return this.decks.pass(id, session.user.id);
  }
}
