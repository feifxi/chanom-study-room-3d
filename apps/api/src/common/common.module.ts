import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module.js';
import { PresenceModule } from '../presence/presence.module.js';
import { CommonController } from './common.controller.js';
import { CommonService } from './common.service.js';

/** Common rooms (feature 14): Connecta's own rooms, copies on the game server, no database rows. */
@Module({ imports: [PresenceModule, GameModule], controllers: [CommonController], providers: [CommonService] })
export class CommonModule {}
