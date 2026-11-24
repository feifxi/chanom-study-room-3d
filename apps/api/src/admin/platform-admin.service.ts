import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PictureCheck } from '../chat/picture-check.js';
import { CommonService } from '../common/common.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { AdminCommon, Moderation } from './admin.schemas.js';
import { requireTeam } from './team.js';

/**
 * The admin site's Common rooms and Moderation pages (docs/features/16-admin.md): how full a copy gets, the notice,
 * the moderation switches and our word list. Each change applies everywhere at once (SettingsService)
 * and goes in the audit log.
 */
@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly common: CommonService,
    private readonly pictures: PictureCheck,
    private readonly audit: AuditService,
  ) {}

  async commonRooms(teamId: string): Promise<AdminCommon> {
    await requireTeam(this.prisma, teamId);
    const [types, notice] = await Promise.all([this.common.overview(), this.common.notice()]);
    const s = this.settings.get();
    return {
      types,
      capacity: s.commonCapacity,
      friendSeats: s.commonFriendSeats,
      notice: notice && { text: notice.text, until: new Date(notice.until).toISOString() },
    };
  }

  async seats(teamId: string, input: { capacity: number; friendSeats: number }): Promise<AdminCommon> {
    await requireTeam(this.prisma, teamId);
    await this.settings.update(teamId, { commonCapacity: input.capacity, commonFriendSeats: input.friendSeats });
    await this.audit.record({ by: teamId, action: 'setting.common_seats', targetKind: 'setting', targetId: 'common', details: input });
    return this.commonRooms(teamId);
  }

  async notice(teamId: string, text: string): Promise<AdminCommon> {
    await requireTeam(this.prisma, teamId);
    await this.common.postNotice(teamId, text);
    return this.commonRooms(teamId);
  }

  async moderation(teamId: string): Promise<Moderation> {
    await requireTeam(this.prisma, teamId);
    return this.view();
  }

  async switches(teamId: string, patch: { wordFilter?: boolean; reportSteps?: boolean; pictureCheck?: boolean }): Promise<Moderation> {
    await requireTeam(this.prisma, teamId);
    await this.settings.update(teamId, patch);
    await this.audit.record({ by: teamId, action: 'setting.moderation', targetKind: 'setting', targetId: 'moderation', details: patch });
    return this.view();
  }

  async addWord(teamId: string, word: string): Promise<Moderation> {
    await requireTeam(this.prisma, teamId);
    if (this.settings.get().words.includes(word)) throw new BadRequestException('Already on the list');
    await this.settings.addWord(teamId, word);
    await this.audit.record({ by: teamId, action: 'setting.word_add', targetKind: 'setting', targetId: 'words', details: { word } });
    return this.view();
  }

  async removeWord(teamId: string, word: string): Promise<Moderation> {
    await requireTeam(this.prisma, teamId);
    await this.settings.removeWord(word);
    await this.audit.record({ by: teamId, action: 'setting.word_remove', targetKind: 'setting', targetId: 'words', details: { word } });
    return this.view();
  }

  private view(): Moderation {
    const s = this.settings.get();
    return {
      wordFilter: s.wordFilter,
      reportSteps: s.reportSteps,
      pictureCheck: s.pictureCheck,
      pictureCheckReady: this.pictures.configured,
      words: s.words,
    };
  }
}
