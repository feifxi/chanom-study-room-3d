import { Body, Controller, Get, HttpCode, Param, Put, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import {
  MyFocusSchema,
  RankingQuerySchema,
  RankingSchema,
  RoomTodaySchema,
  TimeZoneBodySchema,
  TodayQuerySchema,
  type MyFocus,
  type Ranking,
  type RoomToday,
} from './focus.schemas.js';
import { FocusService } from './focus.service.js';

const Id = { schema: z.string().max(40) };

/** Focus minutes: the room's "today", and the time zone your days follow. */
@ApiTags('focus')
@Controller()
export class FocusController {
  constructor(private readonly focus: FocusService) {}

  /** Members' saved focus in this room since your midnight (`tz`, your browser's time zone). */
  @Get('rooms/:id/focus/today')
  @ApiQuery({ name: 'tz', required: false, type: String })
  @ApiOkResponse({ standardSchema: RoomTodaySchema })
  today(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Query({ schema: TodayQuerySchema }) query: z.infer<typeof TodayQuerySchema>,
  ): Promise<RoomToday> {
    return this.focus.roomToday(id, session.user.id, query.tz);
  }

  /** My numbers on the Focus page (only you): the last 7 days in `tz` and minutes per subject. */
  @Get('focus/me')
  @ApiQuery({ name: 'tz', required: false, type: String })
  @ApiOkResponse({ standardSchema: MyFocusSchema })
  mine(@Session() session: UserSession, @Query({ schema: TodayQuerySchema }) query: z.infer<typeof TodayQuerySchema>): Promise<MyFocus> {
    return this.focus.mine(session.user.id, query.tz);
  }

  /** Friends or Everyone, today or this week (from your midnight or Monday in `tz`). */
  @Get('focus/rankings')
  @ApiQuery({ name: 'scope', enum: ['friends', 'everyone'] })
  @ApiQuery({ name: 'period', enum: ['today', 'week'] })
  @ApiQuery({ name: 'tz', required: false, type: String })
  @ApiOkResponse({ standardSchema: RankingSchema })
  ranking(
    @Session() session: UserSession,
    @Query({ schema: RankingQuerySchema }) query: z.infer<typeof RankingQuerySchema>,
  ): Promise<Ranking> {
    return this.focus.ranking(session.user.id, query.scope, query.period, query.tz);
  }

  /** Your browser's time zone: your focus days start at your midnight. */
  @Put('me/time-zone')
  @HttpCode(204)
  @ApiNoContentResponse()
  timeZone(@Session() session: UserSession, @Body({ schema: TimeZoneBodySchema }) body: z.infer<typeof TimeZoneBodySchema>) {
    return this.focus.setTimeZone(session.user.id, body.timeZone);
  }
}
