import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { Person } from '../rooms/rooms.schemas.js';
import type { Inbox, NotificationKind, NotificationView } from './notifications.schemas.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Items are kept this long */
export const INBOX_DAYS = 30;
const SHOWN = 50;

/** Live events */
export const INBOX_EVENTS = {
  /** To you: { notification, unread } (new, or a grouped one that grew) */
  notification: 'notification',
} as const;

interface Payload {
  text: string;
  href: string;
  person: Person | null;
  /** Grouped items: how many so far */
  count?: number;
}

/** A room message as the inbox needs it. */
export interface NewRoomMessage {
  id: string;
  roomId: string;
  text: string;
  mentions: string[];
  mentionsRoom: boolean;
  author: Parameters<typeof toPerson>[0] & { id: string };
}

/**
 * The 🔔 inbox (docs/v2/features/01-app-shell.md#-inbox): friend requests, join requests, @mentions
 * and a room's messages for those who asked for every one. In-app only (no email or push), sent live
 * to your tabs, kept 30 days. DMs aren't in it: Messages has its own badge.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
  ) {}

  async list(userId: string, now = new Date()): Promise<Inbox> {
    const since = new Date(now.getTime() - INBOX_DAYS * DAY_MS);
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId, createdAt: { gt: since } }, orderBy: { createdAt: 'desc' }, take: SHOWN }),
      this.prisma.notification.count({ where: { userId, readAt: null, createdAt: { gt: since } } }),
    ]);
    return { items: rows.map(toView), unread };
  }

  /** Opening an item, or "Mark all read". */
  async read(userId: string, ids?: string[], now = new Date()): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids && { id: { in: ids } }) },
      data: { readAt: now },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purge(now = new Date()): Promise<number> {
    const { count } = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - INBOX_DAYS * DAY_MS) } },
    });
    return count;
  }

  // ── What puts things in it ────────────────────────────────────────────────────────────────────

  async friendRequest(toId: string, from: Person) {
    // Asking again (after it expired) doesn't add a second item
    await this.push(
      toId,
      'friend_request',
      { text: `**${from.name}** sent you a friend request`, href: '/home/friends', person: from },
      `friend:${from.id}`,
    );
  }

  async friendAccepted(toId: string, by: Person) {
    await this.push(toId, 'friend_accepted', { text: `**${by.name}** accepted your friend request`, href: '/home/friends', person: by });
  }

  /** Someone asked to join a room: its owner and mods hear, one item per room that keeps count. */
  async joinRequest(roomId: string, who: Person) {
    const [room, mods, waiting] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: roomId } }),
      this.prisma.membership.findMany({ where: { roomId, role: { in: ['owner', 'mod'] } }, select: { userId: true } }),
      this.prisma.joinRequest.count({ where: { roomId, declinedAt: null } }),
    ]);
    if (!room) return;
    const text = waiting > 1 ? `**${waiting} people** want to join ${room.name}` : `**${who.name}** wants to join ${room.name}`;
    for (const { userId } of mods) {
      await this.push(userId, 'join_request', { text, href: `/r/${roomId}`, person: waiting > 1 ? null : who }, `join:${roomId}`);
    }
  }

  async joined(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (room) await this.push(userId, 'joined', { text: `You’re in! **${room.name}** let you in`, href: `/r/${roomId}`, person: null });
  }

  /**
   * A new room message (once it shows): @mentions and @room for members whose setting isn't
   * Nothing, and one growing "new messages" item for those on Every message. Never for people who
   * blocked the author.
   */
  async roomMessage(m: NewRoomMessage) {
    const [room, members, blockers] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: m.roomId } }),
      this.prisma.membership.findMany({
        where: { roomId: m.roomId, userId: { not: m.author.id }, notify: { not: 'none' } },
        select: { userId: true, notify: true },
      }),
      this.prisma.block.findMany({ where: { blockedId: m.author.id }, select: { userId: true } }),
    ]);
    if (!room) return;
    const skip = new Set(blockers.map((b) => b.userId));
    const mentioned = new Set(m.mentions);
    const author = toPerson(m.author);
    const quote = m.text.length > 80 ? `${m.text.slice(0, 79)}…` : m.text;
    for (const { userId, notify } of members) {
      if (skip.has(userId)) continue;
      if (m.mentionsRoom || mentioned.has(userId)) {
        const text = m.mentionsRoom
          ? `**${author.name}** pinged everyone in ${room.name}: “${quote}”`
          : `**${author.name}** mentioned you in ${room.name}: “${quote}”`;
        await this.push(userId, 'mention', { text, href: `/r/${m.roomId}`, person: author });
      } else if (notify === 'all') {
        await this.push(userId, 'messages', { text: '', href: `/r/${m.roomId}`, person: null }, `messages:${m.roomId}`, (count) =>
          count === 1 ? `**${author.name}** in ${room.name}: “${quote}”` : `**${count} new messages** in ${room.name}`,
        );
      }
    }
  }

  // ── Inside ────────────────────────────────────────────────────────────────────────────────────

  /**
   * Adds an item, or grows the unread one in the same group (moved to the top). `grow` writes the
   * text for a group's count.
   */
  private async push(userId: string, kind: NotificationKind, payload: Payload, groupKey?: string, grow?: (count: number) => string) {
    const existing = groupKey
      ? await this.prisma.notification.findFirst({ where: { userId, groupKey, readAt: null }, orderBy: { createdAt: 'desc' } })
      : null;
    const count = ((existing?.payload as Payload | undefined)?.count ?? 0) + 1;
    const data = { ...payload, count, text: grow ? grow(count) : payload.text };
    const row = existing
      ? await this.prisma.notification.update({ where: { id: existing.id }, data: { payload: data, createdAt: new Date() } })
      : await this.prisma.notification.create({ data: { userId, kind, payload: data, groupKey } });
    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });
    this.live.toUser(userId, INBOX_EVENTS.notification, { notification: toView(row), unread });
  }
}

function toView(row: { id: string; kind: string; payload: unknown; createdAt: Date; readAt: Date | null }): NotificationView {
  const p = row.payload as Payload;
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    text: p.text,
    href: p.href,
    person: p.person ?? null,
    at: row.createdAt.toISOString(),
    unread: !row.readAt,
  };
}
