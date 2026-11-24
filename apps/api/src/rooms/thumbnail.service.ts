import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PictureCheck } from '../chat/picture-check.js';
import { PicturesService, uploadKey } from '../chat/pictures.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

/** Cards show it at most about 640 px wide; twice that stays sharp on phones */
const WIDTH = 1280;
const HEIGHT = 720;

/** The link a room's thumbnail is shown at; the key's name changes with each new picture, so caches never go stale */
export const thumbnailUrl = (roomId: string, key: string | null) =>
  key ? `/api/rooms/${roomId}/thumbnail?v=${key.slice(key.lastIndexOf('/') + 1, key.lastIndexOf('.'))}` : null;

/**
 * A room's thumbnail (docs/features/06-maps.md): the owner uploads it like a chat picture (a short-lived upload
 * link), then it's cropped to 16:9, made a WebP and checked here, at once, since it's one small
 * picture. Anyone may see it: it's on Discover and invite pages, like the room's name.
 */
@Injectable()
export class ThumbnailService {
  private readonly log = new Logger(ThumbnailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pictures: PicturesService,
    private readonly safety: PictureCheck,
  ) {}

  /** The owner's upload becomes the room's thumbnail. Returns its new link. */
  async set(roomId: string, userId: string, pictureId: string): Promise<string> {
    await this.owner(roomId, userId);
    const picture = await this.prisma.picture.findFirst({
      where: { id: pictureId, uploaderId: userId, messageId: null, status: 'uploading' },
    });
    if (!picture) throw new NotFoundException('That picture needs uploading again');
    try {
      const webp = await this.shrink(await this.storage.get(uploadKey(picture.id)));
      if (await this.safety.flagged(webp)) {
        throw new BadRequestException({ code: 'flagged', message: 'That picture can’t be used. Try another one.' });
      }
      const key = `thumbnails/${roomId}/${randomUUID()}.webp`;
      await this.storage.put(key, webp, 'image/webp');
      const old = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId }, select: { thumbnailKey: true } });
      await this.prisma.room.update({ where: { id: roomId }, data: { thumbnailKey: key } });
      await this.drop(old.thumbnailKey);
      return thumbnailUrl(roomId, key)!;
    } finally {
      // The original and its row are done with either way
      await this.pictures.forget([{ id: picture.id, key: null }]);
    }
  }

  /** Back to the map's picture. */
  async clear(roomId: string, userId: string): Promise<void> {
    await this.owner(roomId, userId);
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId }, select: { thumbnailKey: true } });
    await this.prisma.room.update({ where: { id: roomId }, data: { thumbnailKey: null } });
    await this.drop(room.thumbnailKey);
  }

  /** A short-lived link to the picture, for anyone. */
  async open(roomId: string): Promise<string> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { thumbnailKey: true, closedAt: true } });
    if (!room?.thumbnailKey || room.closedAt) throw new NotFoundException();
    return this.storage.downloadUrl(room.thumbnailKey);
  }

  /** A deleted room's picture leaves storage. */
  async drop(key: string | null | undefined): Promise<void> {
    if (!key) return;
    await this.storage.remove([key]).catch((error: unknown) => {
      // A leftover file is cheaper than a room that can't change its picture
      this.log.warn(`Couldn't delete thumbnail ${key}: ${String(error)}`);
    });
  }

  private async owner(roomId: string, userId: string) {
    const me = await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!me) throw new NotFoundException();
    if (me.role !== 'owner') throw new ForbiddenException('Only the owner changes the thumbnail');
  }

  private async shrink(original: Buffer): Promise<Buffer> {
    if (original.length > 5 * 1024 * 1024) throw new BadRequestException({ code: 'too_big', message: 'Thumbnails can be up to 5 MB' });
    try {
      return await sharp(original, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize({ width: WIDTH, height: HEIGHT, fit: 'cover', withoutEnlargement: false })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw new BadRequestException({ code: 'not_a_picture', message: 'That doesn’t look like a picture' });
    }
  }
}
