import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  controllers: [RoomsController, InvitesController],
  providers: [RoomsService],
  // Deleting an account hands its rooms over (accounts module)
  exports: [RoomsService],
})
export class RoomsModule {}
