import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FOCUS_QUEUE } from '@connecta/shared';
import { FocusController } from './focus.controller.js';
import { FocusProcessor } from './focus.processor.js';
import { FocusService } from './focus.service.js';

/** Focus minutes (feature 8): the game server's rounds saved, and the rankings read. */
@Module({
  imports: [BullModule.registerQueue({ name: FOCUS_QUEUE })],
  controllers: [FocusController],
  providers: [FocusService, FocusProcessor],
  exports: [FocusService],
})
export class FocusModule {}
