import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { AccountsCleanup } from './accounts-cleanup.js';
import { AccountsService, SIGN_IN_PROVIDERS, type SignInProviders } from './accounts.service.js';
import { HandlesController } from './handles.controller.js';
import { HandlesService } from './handles.service.js';
import { MeController } from './me.controller.js';

@Module({
  imports: [RoomsModule, FriendsModule],
  controllers: [MeController, HandlesController],
  providers: [
    AccountsService,
    HandlesService,
    AccountsCleanup,
    {
      provide: SIGN_IN_PROVIDERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): SignInProviders => ({
        google: Boolean(config.get('GOOGLE_CLIENT_ID', { infer: true })),
        discord: Boolean(config.get('DISCORD_CLIENT_ID', { infer: true })),
      }),
    },
  ],
})
export class AccountsModule {}
