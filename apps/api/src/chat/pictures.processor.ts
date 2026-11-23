import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { PICTURE_MAX_MB } from '@connecta/shared';
import { UnrecoverableError, type Job } from 'bullmq';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ChatService } from './chat.service.js';
import { PictureCheck } from './picture-check.js';
import { PICTURES_QUEUE, PicturesService, uploadKey } from './pictures.service.js';

/** Longest side once stored; phones send 4,000+ px that nobody needs in a chat */
const LONGEST_SIDE = 2048;

/**
 * The pictures worker: turns an uploaded original into a WebP, runs the safety check, and lets the
 * message show once all its pictures are done. A picture that fails is dropped from its message.
 */
@Processor(PICTURES_QUEUE)
export class PicturesProcessor extends WorkerHost {
  private readonly log = new Logger(PicturesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pictures: PicturesService,
    private readonly chat: ChatService,
    private readonly safety: PictureCheck,
  ) {
    super();
  }

  async process(job: Job<{ pictureId: string }>): Promise<void> {
    const id = job.data.pictureId;
    const picture = await this.prisma.picture.findUnique({ where: { id } });
    if (!picture || picture.status !== 'processing') return;
    try {
      const webp = await this.shrink(await this.storage.get(uploadKey(id)));
      await this.check(webp.data);
      const key = `pictures/${id}.webp`;
      await this.storage.put(key, webp.data, 'image/webp');
      await this.storage.remove([uploadKey(id)]);
      const done = await this.prisma.picture.update({
        where: { id },
        data: { status: 'ready', key, width: webp.info.width, height: webp.info.height, bytes: webp.data.length },
      });
      if (done.messageId) await this.chat.release(done.messageId);
    } catch (error) {
      if (!(error instanceof UnrecoverableError) && job.attemptsMade + 1 < (job.opts.attempts ?? 1)) throw error;
      this.log.warn(`Picture ${id} failed: ${String(error)}`);
      const failed = await this.prisma.picture.findUnique({ where: { id } });
      await this.pictures.forget([{ id, key: null }]);
      if (failed?.messageId) await this.chat.release(failed.messageId, { droppedPicture: true });
      throw error;
    }
  }

  private async shrink(original: Buffer) {
    if (original.length > PICTURE_MAX_MB * 1024 * 1024) throw new UnrecoverableError('too big');
    try {
      return await sharp(original, { limitInputPixels: 50_000_000 })
        // Phones store which way is up separately; bake it in before the metadata goes
        .rotate()
        .resize({ width: LONGEST_SIDE, height: LONGEST_SIDE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new UnrecoverableError('not a picture');
    }
  }

  /** The safety check before a picture can show: a flagged picture is dropped from its message */
  private async check(webp: Buffer): Promise<void> {
    if (await this.safety.flagged(webp)) throw new UnrecoverableError('flagged');
  }
}
