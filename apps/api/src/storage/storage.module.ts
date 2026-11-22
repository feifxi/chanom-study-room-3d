import { Global, Module } from '@nestjs/common';
import { DevStorageController } from './dev-storage.controller.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({ controllers: [DevStorageController], providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
