import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ReportBodySchema, ReportSentSchema, type ReportBody, type ReportSent } from './reports.schemas.js';
import { ReportsService } from './reports.service.js';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Report a person, a message or a room to the Connecta team. Anonymous to the person reported. */
  @Post()
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: ReportSentSchema })
  report(@Session() session: UserSession, @Body({ schema: ReportBodySchema }) body: ReportBody): Promise<ReportSent> {
    return this.reports.report(session.user.id, body);
  }
}
