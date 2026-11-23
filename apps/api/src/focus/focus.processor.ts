import { Processor, WorkerHost } from '@nestjs/bullmq';
import { FOCUS_QUEUE, type FocusRound } from '@connecta/shared';
import type { Job } from 'bullmq';
import { FocusService } from './focus.service.js';

/** Saves the focus rounds the game server queues (a failure retries; the round's id keeps it single). */
@Processor(FOCUS_QUEUE)
export class FocusProcessor extends WorkerHost {
  constructor(private readonly focus: FocusService) {
    super();
  }

  async process(job: Job<FocusRound>): Promise<void> {
    await this.focus.save(job.data);
  }
}
