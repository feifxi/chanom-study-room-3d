import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import {
  AccountActionBodySchema,
  AdminAccountDetailSchema,
  AdminAccountListSchema,
  AdminAccountQuerySchema,
  ReportCaseListSchema,
  ReportCaseQuerySchema,
  ReportDecideBodySchema,
  type AdminAccountDetail,
  type AdminAccountList,
  type ReportCaseList,
} from './admin.schemas.js';
import { AccountsAdminService } from './accounts-admin.service.js';
import { ReportsAdminService } from './reports-admin.service.js';

/** The admin site (feature 14): Connecta team only; everyone else gets 404. */
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly accounts: AccountsAdminService,
    private readonly reports: ReportsAdminService,
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
}
