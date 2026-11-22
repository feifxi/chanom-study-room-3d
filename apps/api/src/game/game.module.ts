import { Global, Module } from '@nestjs/common';
import { GameService } from './game.service.js';

/** Tickets and room events for the game server, used by rooms. */
@Global()
@Module({ providers: [GameService], exports: [GameService] })
export class GameModule {}
