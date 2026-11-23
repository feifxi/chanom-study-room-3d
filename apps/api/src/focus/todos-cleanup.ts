import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TodosService } from './todos.service.js';

/** Nightly: done to-dos older than 7 days go (the list already hides them). */
@Injectable()
export class TodosCleanup {
  private readonly logger = new Logger(TodosCleanup.name);

  constructor(private readonly todos: TodosService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run() {
    const removed = await this.todos.purgeDone();
    if (removed > 0) this.logger.log(`Removed ${removed} done to-do(s) older than 7 days`);
  }
}
