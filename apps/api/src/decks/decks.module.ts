import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module.js';
import { DecksController } from './decks.controller.js';
import { DecksService } from './decks.service.js';

/** Pick a Side's room decks (docs/features/10-party-games.md). */
@Module({
  imports: [GameModule],
  controllers: [DecksController],
  providers: [DecksService],
})
export class DecksModule {}
