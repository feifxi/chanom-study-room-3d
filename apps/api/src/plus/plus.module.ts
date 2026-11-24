import { Global, Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { PlusEndingService } from './plus-ending.service.js';
import { PlusController } from './plus.controller.js';
import { PlusService } from './plus.service.js';

/** Connecta Plus (docs/features/15-plus.md): global, since rooms, pictures and accounts all read it. */
@Global()
@Module({ imports: [MailModule], controllers: [PlusController], providers: [PlusService, PlusEndingService], exports: [PlusService] })
export class PlusModule {}
