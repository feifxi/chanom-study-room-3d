import { Injectable } from '@nestjs/common';
import { GameService } from '../game/game.service.js';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hasPlus } from './plus.js';
import type { PlusStatus } from './plus.schemas.js';

const DAY_MS = 86_400_000;

/**
 * Connecta Plus on an account (spec 15): `users.plus_until`. Paying and gifts (later parts) move the
 * date on; everything that depends on Plus reads it through `hasPlus` / `planFor`.
 */
@Injectable()
export class PlusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
    private readonly game: GameService,
  ) {}

  async status(userId: string, now = new Date()): Promise<PlusStatus> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plusUntil: true } });
    return { plus: hasPlus(user, now), until: user.plusUntil?.toISOString() ?? null };
  }

  /** Plus until a date (null: off now) */
  async setUntil(userId: string, until: Date | null, now = new Date()): Promise<PlusStatus> {
    const before = await this.status(userId, now);
    await this.prisma.user.update({ where: { id: userId }, data: { plusUntil: until } });
    const after = await this.status(userId, now);
    if (after.plus !== before.plus) this.changed(userId, after.plus);
    return after;
  }

  /** Local testing only: a month of Plus, or none */
  devSet(userId: string, on: boolean, now = new Date()) {
    return this.setUntil(userId, on ? new Date(now.getTime() + 30 * DAY_MS) : null, now);
  }

  /** After something else moved plus_until (a payment): tells everyone if Plus started or ended */
  async announce(userId: string, wasPlus: boolean, now = new Date()) {
    const { plus } = await this.status(userId, now);
    if (plus !== wasPlus) this.changed(userId, plus);
    // Billing changed either way (a renewal, a cancel): your tabs refresh the Plus page
    else this.live.toUser(userId, 'plus', { plus });
  }

  /** Your tabs refresh what Plus changes (limits, the Plus page); your name tag changes in rooms */
  private changed(userId: string, plus: boolean) {
    this.live.toUser(userId, 'plus', { plus });
    this.game.roomEvent({ roomId: '*', type: 'plus', userId, plus });
  }
}
