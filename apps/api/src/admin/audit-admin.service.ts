import { Injectable } from '@nestjs/common';
import type { AuditEntry } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuditList, AuditRow } from './admin.schemas.js';
import { requireTeam } from './team.js';

const PAGE = 100;
const SETTING: Record<string, string> = { common: 'Common rooms', moderation: 'Moderation', words: 'the word list' };

/** The audit log page (admin site): every team action and automatic step, newest first. Read-only. */
@Injectable()
export class AuditAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(teamId: string, input: { who?: 'all' | 'team' | 'auto' | 'rooms'; before?: string }): Promise<AuditList> {
    await requireTeam(this.prisma, teamId);
    const rows = await this.prisma.auditEntry.findMany({
      where: {
        // Room mods' actions (roommod.*) are people's too, but not the team's
        ...(input.who === 'team'
          ? { byId: { not: null }, NOT: { action: { startsWith: 'roommod.' } } }
          : input.who === 'auto'
            ? { byId: null }
            : input.who === 'rooms'
              ? { action: { startsWith: 'roommod.' } }
              : {}),
        // Ids are time-ordered (uuid v7): older than the last one shown
        ...(input.before ? { id: { lt: input.before } } : {}),
      },
      orderBy: { id: 'desc' },
      take: PAGE + 1,
    });
    return { entries: await this.rows(rows.slice(0, PAGE)), more: rows.length > PAGE };
  }

  /** Names for who did it and what it was done to, as they are now */
  async rows(entries: AuditEntry[]): Promise<AuditRow[]> {
    const userIds = new Set<string>();
    const roomIds = new Set<string>();
    for (const e of entries) {
      if (e.byId) userIds.add(e.byId);
      if (e.targetKind === 'user') userIds.add(e.targetId);
      if (e.targetKind === 'room') roomIds.add(e.targetId);
      if (e.targetKind === 'report') {
        const [kind, id] = e.targetId.split(':');
        if (kind === 'person' && id) userIds.add(id);
        if (kind === 'room' && id) roomIds.add(id);
      }
    }
    const [users, rooms] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true, handle: true } }),
      this.prisma.room.findMany({ where: { id: { in: [...roomIds] } }, select: { id: true, name: true } }),
    ]);
    const person = new Map(users.map((u) => [u.id, u.handle ? `${u.name} @${u.handle}` : u.name]));
    const room = new Map(rooms.map((r) => [r.id, r.name]));
    const details = (e: AuditEntry) =>
      e.details && typeof e.details === 'object' && !Array.isArray(e.details) ? (e.details as Record<string, unknown>) : {};
    const target = (e: AuditEntry): string => {
      const d = details(e);
      switch (e.targetKind) {
        case 'user':
          return person.get(e.targetId) ?? 'A deleted account';
        case 'room':
          return room.get(e.targetId) ?? (typeof d.name === 'string' ? `${d.name} (deleted)` : 'A deleted room');
        case 'message':
          return typeof d.authorId === 'string' && person.has(d.authorId) ? `A message by ${person.get(d.authorId)}` : 'A message';
        case 'report': {
          const [kind, id = ''] = e.targetId.split(':');
          const who = kind === 'person' ? person.get(id) : kind === 'room' ? room.get(id) : null;
          return `Reports on ${kind === 'message' ? 'a message' : (who ?? `a ${kind}`)}`;
        }
        default:
          return SETTING[e.targetId] ?? e.targetId;
      }
    };
    return entries.map((e) => {
      // What else is worth reading: the word, the duration, the notice…
      const extra = Object.entries(details(e))
        .filter(([k]) => !['name', 'authorId', 'at'].includes(k))
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' · ');
      return {
        id: e.id,
        at: e.createdAt.toISOString(),
        by: e.byId ? (person.get(e.byId)?.split(' @')[0] ?? 'A former team member') : null,
        action: e.action,
        targetKind: e.targetKind,
        target: target(e),
        reason: e.reason,
        details: extra || null,
      };
    });
  }
}
