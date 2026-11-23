import { Body, Controller, Get, HttpCode, Param, Put, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { RoomTodaySchema, TimeZoneBodySchema, TodayQuerySchema, type RoomToday } from './focus.schemas.js';
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

  /** Your browser's time zone: your focus days start at your midnight. */
  @Put('me/time-zone')
  @HttpCode(204)
  @ApiNoContentResponse()
  timeZone(@Session() session: UserSession, @Body({ schema: TimeZoneBodySchema }) body: z.infer<typeof TimeZoneBodySchema>) {
    return this.focus.setTimeZone(session.user.id, body.timeZone);
  }
}
