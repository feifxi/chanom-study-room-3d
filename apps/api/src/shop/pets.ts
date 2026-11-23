import { COAT_BY_ID, shopItem, type PetOut } from '@connecta/shared';
import type { PrismaService } from '../prisma/prisma.service.js';

/** The pets someone owns, for the Buddy Machine (the join ticket, and the room event after a buy) */
export async function petsOf(prisma: PrismaService, userId: string): Promise<PetOut[]> {
  const rows = await prisma.ownedItem.findMany({ where: { userId }, orderBy: { boughtAt: 'asc' } });
  return rows.flatMap((row) => {
    const item = shopItem(row.itemId);
    if (item?.kind !== 'pet' || !COAT_BY_ID.has(item.value)) return [];
    return [{ item: item.id, coat: item.value, name: row.name ?? item.name }];
  });
}
