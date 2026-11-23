import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { MailModule } from '../mail/mail.module.js';
import { AdminController } from './admin.controller.js';
import { AccountsAdminService } from './accounts-admin.service.js';
import { ReportsAdminService } from './reports-admin.service.js';

/** The admin site's API (feature 14), Connecta team only. */
@Module({ imports: [MailModule, ChatModule], controllers: [AdminController], providers: [AccountsAdminService, ReportsAdminService] })
export class AdminModule {}
