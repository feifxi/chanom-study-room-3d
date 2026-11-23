import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { FriendsModule } from '../friends/friends.module.js';
import { GameModule } from '../game/game.module.js';
import { PresenceModule } from '../presence/presence.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

/** Reports and their automatic steps (feature 14). The admin site reads them later. */
@Module({
  imports: [CommonModule, FriendsModule, GameModule, PresenceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
