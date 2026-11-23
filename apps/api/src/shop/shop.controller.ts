import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { WardrobeSchema, type Wardrobe } from './shop.schemas.js';
import { ShopService } from './shop.service.js';

const ItemId = { schema: z.string().max(40) };

@ApiTags('shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  /** Your coins and what you own. */
  @Get('wardrobe')
  @ApiOkResponse({ standardSchema: WardrobeSchema })
  wardrobe(@Session() session: UserSession): Promise<Wardrobe> {
    return this.shop.wardrobe(session.user.id);
  }

  /** Buy an item with coins (400 not_enough_coins, 409 when you have it already). */
  @Post('items/:id/buy')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: WardrobeSchema })
  buy(@Session() session: UserSession, @Param('id', ItemId) id: string): Promise<Wardrobe> {
    return this.shop.buy(session.user.id, id);
  }
}
