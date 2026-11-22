import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountsService } from './accounts.service.js';

/**
 * Deletes accounts whose 7 days are up. Hourly, in the API process: there's one API container for
 * now. When jobs move to a queue (spec 15: BullMQ), this moves with them.
 */
@Injectable()
export class AccountsCleanup {
  private readonly logger = new Logger(AccountsCleanup.name);

  constructor(private readonly accounts: AccountsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    const deleted = await this.accounts.purgeDue();
    if (deleted > 0) this.logger.log(`Deleted ${deleted} account(s) after their 7 days`);
  }
}
