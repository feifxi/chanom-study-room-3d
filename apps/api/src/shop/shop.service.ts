import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { shopItem, SHOP_ITEMS, type AvatarLook } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import { Prisma } from '../generated/prisma/client.js';
import { GameService } from '../game/game.service.js';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { petsOf } from './pets.js';
import type { Wardrobe } from './shop.schemas.js';

/** The Shop items a look uses (nothing for the free ones) */
function itemsIn(look: Partial<AvatarLook>): string[] {
  return SHOP_ITEMS.filter((i) =>
    i.kind === 'accessory' ? look.accessory === i.value : i.kind === 'outfit' && look.style === i.value,
  ).map((i) => i.id);
}

/**
 * The Shop (spec 15): buy cosmetics with earned coins, and a look may only use what you own. Buying
 * takes the coins, writes a coin entry and adds the item in one transaction.
 */
@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
    private readonly game: GameService,
  ) {}

  async wardrobe(userId: string): Promise<Wardrobe> {
    const [user, owned, pets] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { coins: true } }),
      this.prisma.ownedItem.findMany({ where: { userId }, orderBy: { boughtAt: 'asc' }, select: { itemId: true } }),
      petsOf(this.prisma, userId),
    ]);
    return { coins: user.coins, owned: owned.map((o) => o.itemId), pets };
  }

  async buy(userId: string, itemId: string, name?: string): Promise<Wardrobe> {
    await requireSignedUp(this.prisma, userId);
    const item = shopItem(itemId);
    if (!item) throw new NotFoundException('That isn’t in the Shop');
    await this.prisma
      .$transaction(async (tx) => {
        if (await tx.ownedItem.findUnique({ where: { userId_itemId: { userId, itemId } } }))
          throw new ConflictException('You already have it');
        // Only takes the coins if there are enough (two buys at once can't go below zero)
        const paid = await tx.user.updateMany({
          where: { id: userId, coins: { gte: item.price } },
          data: { coins: { decrement: item.price } },
        });
        if (!paid.count) throw new BadRequestException({ message: 'Not enough coins yet', code: 'not_enough_coins' });
        await tx.coinEntry.create({ data: { userId, amount: -item.price, reason: `shop:${item.id}` } });
        await tx.ownedItem.create({ data: { userId, itemId, name: item.kind === 'pet' ? (name ?? item.name) : null } });
      })
      .catch((error: unknown) => {
        // The same item bought twice at once: the second rolls back, coins and all
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
          throw new ConflictException('You already have it');
        throw error;
      });
    // Your other tabs: the coins in the header and the quest list
    this.live.toUser(userId, 'quests', {});
    const wardrobe = await this.wardrobe(userId);
    // A new pet: the Buddy Machine offers it right away in a room you're already in
    if (item.kind === 'pet') this.game.roomEvent({ roomId: '*', type: 'pets', userId, pets: wardrobe.pets });
    return wardrobe;
  }

  /** Throws unless the look only uses free items and ones you own */
  async checkLook(userId: string, look: Partial<AvatarLook>) {
    const needs = itemsIn(look);
    if (!needs.length) return;
    const owned = await this.prisma.ownedItem.count({ where: { userId, itemId: { in: needs } } });
    if (owned < needs.length) throw new BadRequestException({ message: 'You don’t own that yet: it’s in the Shop', code: 'not_owned' });
  }
}
