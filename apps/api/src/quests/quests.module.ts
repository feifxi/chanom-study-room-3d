import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUESTS_QUEUE } from '@connecta/shared';
import { QuestsController } from './quests.controller.js';
import { QuestsProcessor } from './quests.processor.js';
import { QuestsService } from './quests.service.js';

/** Daily quests and coins (spec 15): counted from the game server's events and Room chat. */
@Module({
  imports: [BullModule.registerQueue({ name: QUESTS_QUEUE })],
  controllers: [QuestsController],
  providers: [QuestsService, QuestsProcessor],
  exports: [QuestsService],
})
export class QuestsModule {}
