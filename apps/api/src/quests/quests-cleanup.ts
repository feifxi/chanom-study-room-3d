import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuestsService } from './quests.service.js';

/** Nightly: quest progress older than a week goes (coins already paid stay in the coin ledger). */
@Injectable()
export class QuestsCleanup {
  private readonly logger = new Logger(QuestsCleanup.name);

  constructor(private readonly quests: QuestsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run() {
    const removed = await this.quests.purgeOld();
    if (removed > 0) this.logger.log(`Removed ${removed} old quest progress row(s)`);
  }
}
