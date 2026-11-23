import { Global, Module } from '@nestjs/common';
import { PlusController } from './plus.controller.js';
import { PlusService } from './plus.service.js';

/** Connecta Plus (spec 15): global, since rooms, pictures and accounts all read it. */
@Global()
@Module({ controllers: [PlusController], providers: [PlusService], exports: [PlusService] })
export class PlusModule {}
