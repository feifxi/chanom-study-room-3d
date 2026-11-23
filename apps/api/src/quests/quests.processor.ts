import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUESTS_QUEUE, type QuestEvent } from '@connecta/shared';
import type { Job } from 'bullmq';
import { QuestsService } from './quests.service.js';

/** Counts what the game server reports towards the day's quests. */
@Processor(QUESTS_QUEUE)
export class QuestsProcessor extends WorkerHost {
  constructor(private readonly quests: QuestsService) {
    super();
  }

  async process(job: Job<QuestEvent>): Promise<void> {
    await this.quests.count(job.data);
  }
}
