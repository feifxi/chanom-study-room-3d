import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FOCUS_QUEUE } from '@connecta/shared';
import { FocusController } from './focus.controller.js';
import { FocusProcessor } from './focus.processor.js';
import { FocusService } from './focus.service.js';
import { TodosCleanup } from './todos-cleanup.js';
import { TodosController } from './todos.controller.js';
import { TodosService } from './todos.service.js';

/** Study tools (feature 8): the game server's focus rounds saved, the rankings, and the to-do list. */
@Module({
  imports: [BullModule.registerQueue({ name: FOCUS_QUEUE })],
  controllers: [FocusController, TodosController],
  providers: [FocusService, FocusProcessor, TodosService, TodosCleanup],
  exports: [FocusService],
})
export class FocusModule {}
