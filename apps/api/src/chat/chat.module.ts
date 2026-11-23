import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ChatController, PicturesController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { PictureCheck } from './picture-check.js';
import { PicturesProcessor } from './pictures.processor.js';
import { PICTURES_QUEUE, PicturesService } from './pictures.service.js';
import { QuestsModule } from '../quests/quests.module.js';

@Module({
  imports: [BullModule.registerQueue({ name: PICTURES_QUEUE }), QuestsModule],
  controllers: [ChatController, PicturesController],
  providers: [ChatService, PicturesService, PicturesProcessor, PictureCheck],
  // Rooms show unread counts on Home; the admin site says whether the picture check can run
  exports: [ChatService, PictureCheck],
})
export class ChatModule {}
