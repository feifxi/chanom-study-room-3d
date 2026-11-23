import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { AdminController } from './admin.controller.js';
import { AccountsAdminService } from './accounts-admin.service.js';

/** The admin site's API (feature 14), Connecta team only. */
@Module({ imports: [MailModule], controllers: [AdminController], providers: [AccountsAdminService] })
export class AdminModule {}
