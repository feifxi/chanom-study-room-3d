import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Put, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiConflictResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import {
  AccountDetailsSchema,
  BirthdayBodySchema,
  DeletionBodySchema,
  HandleBodySchema,
  ProfileBodySchema,
  TooSoonSchema,
  type AccountDetails,
  GuestBodySchema,
  HandleCheckSchema,
  MeSchema,
  SignUpBodySchema,
  TooYoungSchema,
  type Me,
} from './accounts.schemas.js';
import { AccountsService } from './accounts.service.js';
import { deviceId } from './device-id.js';
import type { z } from 'zod';

/** The signed-in person (or guest). Signing in itself is Better Auth's, under /api/auth/*. */
@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  @ApiOkResponse({ standardSchema: MeSchema })
  me(@Session() session: UserSession): Promise<Me> {
    return this.accounts.me(session.user.id);
  }

  /** Sign-up step 2. Under 13 answers 403 too_young, and the sign-in and browser wait a day. */
  @Post('birthday')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: MeSchema })
  @ApiForbiddenResponse({ standardSchema: TooYoungSchema })
  birthday(
    @Session() session: UserSession,
    @Body({ schema: BirthdayBodySchema }) body: z.infer<typeof BirthdayBodySchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Me> {
    const secure = this.config.get('NODE_ENV', { infer: true }) === 'production';
    return this.accounts.setBirthday(session.user.id, body.birthday, deviceId(req, res, secure));
  }

  /** Sign-up step 3: character, display name and @handle. 409 with suggestions if the handle is taken. */
  @Post('sign-up')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: MeSchema })
  @ApiConflictResponse({ standardSchema: HandleCheckSchema })
  signUp(@Session() session: UserSession, @Body({ schema: SignUpBodySchema }) body: z.infer<typeof SignUpBodySchema>): Promise<Me> {
    return this.accounts.signUp(session.user.id, body);
  }

  /** A guest's name and character, set right after the guest session starts. */
  @Put('guest')
  @ApiOkResponse({ standardSchema: MeSchema })
  guest(@Session() session: UserSession, @Body({ schema: GuestBodySchema }) body: z.infer<typeof GuestBodySchema>): Promise<Me> {
    return this.accounts.setGuest(session.user.id, body);
  }

  /** Settings → My profile / My character: display name and look. */
  @Patch('profile')
  @ApiOkResponse({ standardSchema: MeSchema })
  profile(@Session() session: UserSession, @Body({ schema: ProfileBodySchema }) body: z.infer<typeof ProfileBodySchema>): Promise<Me> {
    return this.accounts.updateProfile(session.user.id, body);
  }

  /** A new @handle: once every 30 days (409 too_soon), and it must be free (409 handle_unavailable). */
  @Put('handle')
  @ApiOkResponse({ standardSchema: MeSchema })
  @ApiConflictResponse({ standardSchema: TooSoonSchema })
  handle(@Session() session: UserSession, @Body({ schema: HandleBodySchema }) body: z.infer<typeof HandleBodySchema>): Promise<Me> {
    return this.accounts.changeHandle(session.user.id, body.handle);
  }

  /** Settings → Account: email, birthday, linked sign-ins. Only ever shown to the person themselves. */
  @Get('account')
  @ApiOkResponse({ standardSchema: AccountDetailsSchema })
  account(@Session() session: UserSession): Promise<AccountDetails> {
    return this.accounts.accountDetails(session.user.id);
  }

  /**
   * Delete my account in 7 days (signs out every other browser). Confirmed by typing the @handle; picks
   * who takes over each room you own.
   */
  @Post('deletion')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: MeSchema })
  requestDeletion(
    @Session() session: UserSession,
    @Body({ schema: DeletionBodySchema }) body: z.infer<typeof DeletionBodySchema>,
  ): Promise<Me> {
    return this.accounts.requestDeletion(session.user.id, session.session.id, body.handle, body.heirs);
  }

  /** "Keep my account". */
  @Delete('deletion')
  @ApiOkResponse({ standardSchema: MeSchema })
  keep(@Session() session: UserSession): Promise<Me> {
    return this.accounts.keepAccount(session.user.id);
  }
}
