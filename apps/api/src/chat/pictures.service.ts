import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PICTURES_MAX } from '@connecta/shared';
import { planFor } from '../plus/plus.js';
import type { Queue } from 'bullmq';
import { requireSignedUp } from '../accounts/signed-up.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

/** Uploads an hour, against someone filling storage */
const UPLOADS_PER_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;

export const PICTURES_QUEUE = 'pictures';
export const pictureUrl = (id: string) => `/api/pictures/${id}`;
/** Where the browser puts the original, before the worker makes the WebP */
export const uploadKey = (id: string) => `uploads/${id}`;

/**
 * Pictures in chat (docs/features/04-chat.md): the browser uploads the original
 * straight to S3 through a short-lived link, the pictures worker shrinks and checks it
 * (PicturesProcessor), and the message shows once its pictures are ready. Viewing is a short-lived
 * link too, handed only to the room's members, so private rooms' pictures stay private.
 */
@Injectable()
export class PicturesService {
  private readonly log = new Logger(PicturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(PICTURES_QUEUE) private readonly queue: Queue,
  ) {}

  /** Step 1: a picture to fill, and the link to PUT it to. */
  async start(userId: string, file: { contentType: string; bytes: number }, now = new Date()) {
    // Uploads follow your own plan: 10 MB, 50 MB with Plus
    const { uploadMb } = planFor(await requireSignedUp(this.prisma, userId), now);
    if (file.bytes > uploadMb * 1024 * 1024) {
      throw new BadRequestException({ message: `Pictures can be up to ${uploadMb} MB`, code: 'too_big', maxMb: uploadMb });
    }
    const recent = await this.prisma.picture.count({ where: { uploaderId: userId, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } } });
    if (recent >= UPLOADS_PER_HOUR) {
      throw new HttpException({ message: 'That’s a lot of pictures. Try again in a bit.', code: 'too_many' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const picture = await this.prisma.picture.create({ data: { uploaderId: userId, createdAt: now } });
    return {
      id: picture.id,
      uploadUrl: await this.storage.uploadUrl(uploadKey(picture.id), file.contentType, file.bytes),
      headers: { 'Content-Type': file.contentType },
    };
  }

  /** Step 2: the browser's upload finished; the worker takes it from here. */
  async uploaded(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.picture.updateMany({
      where: { id, uploaderId: userId, status: 'uploading' },
      data: { status: 'processing' },
    });
    if (!count) throw new NotFoundException();
    // Retries cover storage hiccups; the job id stops a double "done" from processing it twice
    await this.queue.add(
      'shrink',
      { pictureId: id },
      { jobId: id, attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true, removeOnFail: 100 },
    );
  }

  /** A short-lived link to the picture, for the room's members (or its uploader before it's sent). */
  async open(userId: string, id: string): Promise<string> {
    const picture = await this.prisma.picture.findUnique({ where: { id }, include: { message: { include: { dm: true } } } });
    if (!picture?.key || picture.status !== 'ready') throw new NotFoundException();
    const message = picture.message;
    const roomId = message?.roomId;
    const allowed = !message
      ? picture.uploaderId === userId
      : !message.deletedAt &&
        (roomId
          ? !!(await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }))
          : !!message.dm?.pair.split(':').includes(userId));
    if (!allowed) throw new NotFoundException();
    return this.storage.downloadUrl(picture.key);
  }

  /**
   * Step 3: your uploads go on the message you're sending, in the order you picked them. Returns
   * whether they're all ready, so the message can show at once.
   */
  async attach(userId: string, ids: string[], messageId: string): Promise<boolean> {
    if (!ids.length) return true;
    if (ids.length > PICTURES_MAX) throw new BadRequestException(`Up to ${PICTURES_MAX} pictures a message`);
    const mine = await this.prisma.picture.findMany({
      where: { id: { in: ids }, uploaderId: userId, messageId: null, status: { in: ['processing', 'ready'] } },
    });
    if (mine.length !== new Set(ids).size) throw new BadRequestException('Those pictures need uploading again');
    await this.prisma.$transaction(ids.map((id, position) => this.prisma.picture.update({ where: { id }, data: { messageId, position } })));
    return mine.every((p) => p.status === 'ready');
  }

  /** A deleted message's pictures leave storage. */
  async removeFor(messageId: string): Promise<void> {
    await this.forget(await this.prisma.picture.findMany({ where: { messageId } }));
  }

  /** Uploads never sent (the message box was closed) go after a day. */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeUnsent(now = new Date()): Promise<number> {
    const stale = await this.prisma.picture.findMany({
      where: { messageId: null, createdAt: { lt: new Date(now.getTime() - 24 * HOUR_MS) } },
      take: 500,
    });
    await this.forget(stale);
    return stale.length;
  }

  async forget(pictures: { id: string; key: string | null }[]) {
    if (!pictures.length) return;
    const keys = pictures.flatMap((p) => [uploadKey(p.id), ...(p.key ? [p.key] : [])]);
    await this.storage.remove(keys).catch((error: unknown) => {
      // The rows go anyway; a leftover file is cheaper than a picture that can't be deleted
      this.log.warn(`Couldn't delete pictures from storage: ${String(error)}`);
    });
    await this.prisma.picture.deleteMany({ where: { id: { in: pictures.map((p) => p.id) } } });
  }
}
