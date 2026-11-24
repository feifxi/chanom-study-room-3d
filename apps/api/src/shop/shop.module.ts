import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller.js';
import { ShopService } from './shop.service.js';

/** The Shop (docs/features/14-coins-and-shop.md): cosmetics bought with earned coins, and the check that a look uses only what you own. */
@Module({ controllers: [ShopController], providers: [ShopService], exports: [ShopService] })
export class ShopModule {}
