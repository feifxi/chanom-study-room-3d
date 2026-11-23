import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { CommonModule } from '../common/common.module.js';
import { PresenceModule } from '../presence/presence.module.js';
import { MailModule } from '../mail/mail.module.js';
import { AdminController } from './admin.controller.js';
import { AccountsAdminService } from './accounts-admin.service.js';
import { PlatformAdminService } from './platform-admin.service.js';
import { ReportsAdminService } from './reports-admin.service.js';
import { RoomsAdminService } from './rooms-admin.service.js';

/** The admin site's API (feature 14), Connecta team only. */
@Module({
  imports: [MailModule, ChatModule, CommonModule, PresenceModule],
  controllers: [AdminController],
  providers: [AccountsAdminService, ReportsAdminService, RoomsAdminService, PlatformAdminService],
})
export class AdminModule {}
