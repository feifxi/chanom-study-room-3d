import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { CommonModule } from '../common/common.module.js';
import { PresenceModule } from '../presence/presence.module.js';
import { MailModule } from '../mail/mail.module.js';
import { AdminController } from './admin.controller.js';
import { AccountsAdminService } from './accounts-admin.service.js';
import { AuditAdminService } from './audit-admin.service.js';
import { MoneyAdminService } from './money-admin.service.js';
import { OverviewAdminService } from './overview-admin.service.js';
import { PlatformAdminService } from './platform-admin.service.js';
import { ReportsAdminService } from './reports-admin.service.js';
import { RoomsAdminService } from './rooms-admin.service.js';

/** The admin site's API (feature 14), Connecta team only. */
@Module({
  imports: [MailModule, ChatModule, CommonModule, PresenceModule, BillingModule],
  controllers: [AdminController],
  providers: [
    AccountsAdminService,
    ReportsAdminService,
    RoomsAdminService,
    PlatformAdminService,
    OverviewAdminService,
    MoneyAdminService,
    AuditAdminService,
  ],
})
export class AdminModule {}
