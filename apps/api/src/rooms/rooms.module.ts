import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { InvitesController } from './invites.controller.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [ChatModule],
  controllers: [RoomsController, InvitesController],
  providers: [RoomsService],
  // Deleting an account hands its rooms over (accounts module)
  exports: [RoomsService],
})
export class RoomsModule {}
