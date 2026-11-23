import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module.js';
import { DecksController } from './decks.controller.js';
import { DecksService } from './decks.service.js';

/** Pick a Side's room decks (feature 11). */
@Module({
  imports: [GameModule],
  controllers: [DecksController],
  providers: [DecksService],
})
export class DecksModule {}
