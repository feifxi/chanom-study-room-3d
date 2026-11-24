import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUESTS_QUEUE } from '@connecta/shared';
import { QuestsController } from './quests.controller.js';
import { QuestsProcessor } from './quests.processor.js';
import { QuestsCleanup } from './quests-cleanup.js';
import { QuestsService } from './quests.service.js';

/** Daily quests and coins (docs/features/14-coins-and-shop.md): counted from the game server's events and Room chat. */
@Module({
  imports: [BullModule.registerQueue({ name: QUESTS_QUEUE })],
  controllers: [QuestsController],
  providers: [QuestsService, QuestsProcessor, QuestsCleanup],
  exports: [QuestsService],
})
export class QuestsModule {}
