import { Global, Module } from '@nestjs/common';
import { LiveService } from './live.service.js';

/** Live events to open tabs, available everywhere in the API. */
@Global()
@Module({ providers: [LiveService], exports: [LiveService] })
export class LiveModule {}
