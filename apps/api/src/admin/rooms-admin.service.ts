import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { maxInside, type RoomSize } from '@connecta/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { GameService } from '../game/game.service.js';
import { roomMail, type RoomActionKind } from '../mail/account-mail.js';
import { MailService } from '../mail/mail.service.js';
import { roomPlus } from '../plus/plus.js';
import { PresenceService } from '../presence/presence.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminRoom, AdminRoomList, ROOM_FILTERS } from './admin.schemas.js';
import { requireTeam } from './team.js';

const PAGE = 50;

const include = {
  members: { where: { role: 'owner' }, include: { user: true }, take: 1 },
  _count: { select: { members: true } },
} satisfies Prisma.RoomInclude;
type RoomRow = Prisma.RoomGetPayload<{ include: typeof include }>;

/**
 * Rooms in the admin site (feature 14). The team doesn't run rooms (owners and mods do); it can only
 * take one off Discover or close it for breaking the platform rules, and undo either. The owner gets
 * an email with the reason; everything goes in the audit log.
 */
@Injectable()
export class RoomsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly game: GameService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async list(teamId: string, input: { q?: string; filter?: (typeof ROOM_FILTERS)[number] }): Promise<AdminRoomList> {
    await requireTeam(this.prisma, teamId);
    const q = input.q?.replace(/^@/, '');
    const reported = input.filter === 'reported' ? await this.reportedIds() : null;
    const where: Prisma.RoomWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              {
                members: {
                  some: {
                    role: 'owner',
                    user: { OR: [{ handle: { contains: q.toLowerCase() } }, { name: { contains: q, mode: 'insensitive' } }] },
                  },
                },
              },
            ],
          }
        : {}),
      ...(input.filter === 'listed' ? { visibility: { in: ['request', 'open'] }, delistedAt: null, closedAt: null } : {}),
      ...(input.filter === 'closed' ? { closedAt: { not: null } } : {}),
      ...(reported ? { id: { in: reported } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.room.findMany({ where, include, orderBy: { createdAt: 'desc' }, take: PAGE }),
      this.prisma.room.count({ where }),
    ]);
    return { rooms: await Promise.all(rows.map((r) => this.view(r))), total };
  }

  async act(teamId: string, roomId: string, input: { kind: RoomActionKind; reason: string }, now = new Date()): Promise<AdminRoom> {
    await requireTeam(this.prisma, teamId);
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, include });
    if (!room) throw new NotFoundException('That room is gone');
    const { kind, reason } = input;
    const data: Prisma.RoomUpdateInput | null =
      kind === 'delist'
        ? room.delistedAt || room.closedAt
          ? null
          : { delistedAt: now }
        : kind === 'relist'
          ? room.delistedAt && !room.closedAt
            ? { delistedAt: null }
            : null
          : kind === 'close'
            ? room.closedAt
              ? null
              : { closedAt: now }
            : room.closedAt
              ? // Reopened: back on Discover too (delist it again if it should stay off)
                { closedAt: null, delistedAt: null }
              : null;
    if (!data)
      throw new BadRequestException(
        `That room can’t be ${kind === 'relist' ? 'relisted' : kind === 'reopen' ? 'reopened' : `${kind}d`} now`,
      );
    const updated = await this.prisma.room.update({ where: { id: roomId }, data, include });
    // Closed: everyone inside goes, as when a room is deleted
    if (kind === 'close') this.game.roomEvent({ roomId, type: 'deleted', closed: true });
    await this.audit.record({
      by: teamId,
      action: `room.${kind}`,
      targetKind: 'room',
      targetId: roomId,
      reason,
      details: { name: room.name },
    });
    const owner = room.members[0]?.user;
    if (owner && !owner.isAnonymous) await this.mail.deliver(roomMail(owner.email, kind, room.name, reason));
    return this.view(updated);
  }

  /** Rooms with open reports about them */
  private async reportedIds(): Promise<string[]> {
    const rows = await this.prisma.report.findMany({
      where: { kind: 'room', status: 'open' },
      select: { place: true },
      distinct: ['place'],
    });
    return rows.map((r) => r.place).filter((p): p is string => !!p);
  }

  private async view(room: RoomRow, now = new Date()): Promise<AdminRoom> {
    const owner = room.members[0]?.user ?? null;
    const plus = roomPlus(owner, now);
    const [inside, reports] = await Promise.all([
      this.presence.inside(room.id, now.getTime(), true),
      this.prisma.report.count({ where: { kind: 'room', place: room.id, status: 'open' } }),
    ]);
    return {
      id: room.id,
      name: room.name,
      emoji: room.emoji,
      mapId: room.mapId,
      visibility: room.visibility,
      owner: owner && { id: owner.id, name: owner.name, handle: owner.handle },
      plus,
      members: room._count.members,
      inside: inside.length,
      capacity: room.capacity ?? maxInside(plus, room.size as RoomSize),
      reports,
      state: room.closedAt ? 'closed' : room.delistedAt ? 'delisted' : 'ok',
      createdAt: room.createdAt.toISOString(),
    };
  }
}
