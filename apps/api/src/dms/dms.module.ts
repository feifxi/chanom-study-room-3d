import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { DmsController } from './dms.controller.js';
import { DmsService } from './dms.service.js';

@Module({ imports: [ChatModule, RoomsModule], controllers: [DmsController], providers: [DmsService], exports: [DmsService] })
export class DmsModule {}
