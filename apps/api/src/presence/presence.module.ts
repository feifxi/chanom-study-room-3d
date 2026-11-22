import { Global, Module } from '@nestjs/common';
import { PresenceService } from './presence.service.js';

/** Used by the gateway (which reports tabs) and the API (which reads for lists). */
@Global()
@Module({ providers: [PresenceService], exports: [PresenceService] })
export class PresenceModule {}
