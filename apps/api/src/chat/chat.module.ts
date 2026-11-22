import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ChatController, PicturesController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { PicturesProcessor } from './pictures.processor.js';
import { PICTURES_QUEUE, PicturesService } from './pictures.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: PICTURES_QUEUE })],
  controllers: [ChatController, PicturesController],
  providers: [ChatService, PicturesService, PicturesProcessor],
  // Rooms show unread counts on Home
  exports: [ChatService],
})
export class ChatModule {}
