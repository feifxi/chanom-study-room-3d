import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import {
  AccountActionBodySchema,
  AdminAccountDetailSchema,
  AdminAccountListSchema,
  AdminAccountQuerySchema,
  AdminCommonSchema,
  AdminMoneyQuerySchema,
  AdminMoneySchema,
  AdminOverviewSchema,
  AuditListSchema,
  AuditQuerySchema,
  RefundBodySchema,
  type AdminMoney,
  type AdminOverview,
  type AuditList,
  AdminRoomListSchema,
  AdminRoomQuerySchema,
  AdminRoomSchema,
  CommonNoticeBodySchema,
  CommonSeatsBodySchema,
  ModerationBodySchema,
  ModerationSchema,
  RoomActionBodySchema,
  WordBodySchema,
  type AdminCommon,
  type AdminRoom,
  type AdminRoomList,
  type Moderation,
  ReportCaseListSchema,
  ReportCaseQuerySchema,
  ReportDecideBodySchema,
  type AdminAccountDetail,
  type AdminAccountList,
  type ReportCaseList,
} from './admin.schemas.js';
import { AccountsAdminService } from './accounts-admin.service.js';
import { AuditAdminService } from './audit-admin.service.js';
import { MoneyAdminService } from './money-admin.service.js';
import { OverviewAdminService } from './overview-admin.service.js';
import { PlatformAdminService } from './platform-admin.service.js';
import { ReportsAdminService } from './reports-admin.service.js';
import { RoomsAdminService } from './rooms-admin.service.js';

/** The admin site (feature 14): Connecta team only; everyone else gets 404. */
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly accounts: AccountsAdminService,
    private readonly reports: ReportsAdminService,
    private readonly rooms: RoomsAdminService,
    private readonly platform: PlatformAdminService,
    private readonly overviewService: OverviewAdminService,
    private readonly moneyService: MoneyAdminService,
    private readonly auditLog: AuditAdminService,
  ) {}

  /** Accounts, newest first (50), by name or @handle and a filter. */
  @Get('users')
  @ApiOkResponse({ standardSchema: AdminAccountListSchema })
  users(
    @Session() session: UserSession,
    @Query({ schema: AdminAccountQuerySchema }) query: z.infer<typeof AdminAccountQuerySchema>,
  ): Promise<AdminAccountList> {
    return this.accounts.list(session.user.id, query);
  }

  @Get('users/:id')
  @ApiOkResponse({ standardSchema: AdminAccountDetailSchema })
  user(@Session() session: UserSession, @Param('id', { schema: z.string().max(64) }) id: string): Promise<AdminAccountDetail> {
    return this.accounts.detail(session.user.id, id);
  }

  /** Warn, suspend 1 or 7 days, ban, lift, reset name: recorded, emailed with the reason. */
  @Post('users/:id/actions')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: AdminAccountDetailSchema })
  act(
    @Session() session: UserSession,
    @Param('id', { schema: z.string().max(64) }) id: string,
    @Body({ schema: AccountActionBodySchema }) body: z.infer<typeof AccountActionBodySchema>,
  ): Promise<AdminAccountDetail> {
    return this.accounts.act(session.user.id, id, body);
  }

  /** The reports queue: open cases (urgent first, then oldest) or done ones (newest decision first). */
  @Get('reports')
  @ApiOkResponse({ standardSchema: ReportCaseListSchema })
  reportCases(
    @Session() session: UserSession,
    @Query({ schema: ReportCaseQuerySchema }) query: z.infer<typeof ReportCaseQuerySchema>,
  ): Promise<ReportCaseList> {
    return this.reports.list(session.user.id, query.status);
  }

  /** Decide a case: acts, then closes every report in it. */
  @Post('reports/:key/decide')
  @HttpCode(204)
  decide(
    @Session() session: UserSession,
    @Param('key', { schema: z.string().max(200) }) key: string,
    @Body({ schema: ReportDecideBodySchema }) body: z.infer<typeof ReportDecideBodySchema>,
  ): Promise<void> {
    return this.reports.decide(session.user.id, key, body);
  }

  /** Rooms, newest first (50), by name or owner and a filter. */
  @Get('rooms')
  @ApiOkResponse({ standardSchema: AdminRoomListSchema })
  roomList(
    @Session() session: UserSession,
    @Query({ schema: AdminRoomQuerySchema }) query: z.infer<typeof AdminRoomQuerySchema>,
  ): Promise<AdminRoomList> {
    return this.rooms.list(session.user.id, query);
  }

  /** Delist, relist, close, reopen: the owner is emailed the reason. */
  @Post('rooms/:id/actions')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: AdminRoomSchema })
  roomAction(
    @Session() session: UserSession,
    @Param('id', { schema: z.string().max(64) }) id: string,
    @Body({ schema: RoomActionBodySchema }) body: z.infer<typeof RoomActionBodySchema>,
  ): Promise<AdminRoom> {
    return this.rooms.act(session.user.id, id, body);
  }

  /** Common rooms: the copies open now, how full they get, the notice. */
  @Get('common')
  @ApiOkResponse({ standardSchema: AdminCommonSchema })
  commonRooms(@Session() session: UserSession): Promise<AdminCommon> {
    return this.platform.commonRooms(session.user.id);
  }

  @Put('common/seats')
  @ApiOkResponse({ standardSchema: AdminCommonSchema })
  commonSeats(
    @Session() session: UserSession,
    @Body({ schema: CommonSeatsBodySchema }) body: z.infer<typeof CommonSeatsBodySchema>,
  ): Promise<AdminCommon> {
    return this.platform.seats(session.user.id, body);
  }

  /** A banner in every Common room for 10 minutes. */
  @Post('common/notice')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: AdminCommonSchema })
  commonNotice(
    @Session() session: UserSession,
    @Body({ schema: CommonNoticeBodySchema }) body: z.infer<typeof CommonNoticeBodySchema>,
  ): Promise<AdminCommon> {
    return this.platform.notice(session.user.id, body.text);
  }

  /** The moderation switches and our word list. */
  @Get('moderation')
  @ApiOkResponse({ standardSchema: ModerationSchema })
  moderation(@Session() session: UserSession): Promise<Moderation> {
    return this.platform.moderation(session.user.id);
  }

  @Patch('moderation')
  @ApiOkResponse({ standardSchema: ModerationSchema })
  moderationSwitches(
    @Session() session: UserSession,
    @Body({ schema: ModerationBodySchema }) body: z.infer<typeof ModerationBodySchema>,
  ): Promise<Moderation> {
    return this.platform.switches(session.user.id, body);
  }

  @Post('moderation/words')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: ModerationSchema })
  addWord(@Session() session: UserSession, @Body({ schema: WordBodySchema }) body: z.infer<typeof WordBodySchema>): Promise<Moderation> {
    return this.platform.addWord(session.user.id, body.word);
  }

  @Delete('moderation/words/:word')
  @ApiOkResponse({ standardSchema: ModerationSchema })
  removeWord(@Session() session: UserSession, @Param('word', { schema: z.string().max(60) }) word: string): Promise<Moderation> {
    return this.platform.removeWord(session.user.id, word);
  }

  /** How Connecta is doing now: numbers, the health strip, urgent reports, the latest actions. */
  @Get('overview')
  @ApiOkResponse({ standardSchema: AdminOverviewSchema })
  overview(@Session() session: UserSession): Promise<AdminOverview> {
    return this.overviewService.overview(session.user.id);
  }

  /** What Plus brings in, how people pay, every payment (newest 100). */
  @Get('money')
  @ApiOkResponse({ standardSchema: AdminMoneySchema })
  money(
    @Session() session: UserSession,
    @Query({ schema: AdminMoneyQuerySchema }) query: z.infer<typeof AdminMoneyQuerySchema>,
  ): Promise<AdminMoney> {
    return this.moneyService.money(session.user.id, query.filter);
  }

  /** Give a payment back, for a real mistake: emailed, in the audit log. */
  @Post('money/payments/:id/refund')
  @HttpCode(204)
  refund(
    @Session() session: UserSession,
    @Param('id', { schema: z.string().max(64) }) id: string,
    @Body({ schema: RefundBodySchema }) body: z.infer<typeof RefundBodySchema>,
  ): Promise<void> {
    return this.moneyService.refund(session.user.id, id, body.reason);
  }

  /** Every team action and automatic step, newest first, 100 at a time. */
  @Get('audit')
  @ApiOkResponse({ standardSchema: AuditListSchema })
  auditEntries(
    @Session() session: UserSession,
    @Query({ schema: AuditQuerySchema }) query: z.infer<typeof AuditQuerySchema>,
  ): Promise<AuditList> {
    return this.auditLog.list(session.user.id, query);
  }
}
