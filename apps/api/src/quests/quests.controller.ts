import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { QuestsTodaySchema, type QuestsToday } from './quests.schemas.js';
import { QuestsService } from './quests.service.js';

@ApiTags('quests')
@Controller('quests')
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  /** Your three quests today (from your midnight) and your coins. */
  @Get('today')
  @ApiOkResponse({ standardSchema: QuestsTodaySchema })
  today(@Session() session: UserSession): Promise<QuestsToday> {
    return this.quests.today(session.user.id);
  }
}
