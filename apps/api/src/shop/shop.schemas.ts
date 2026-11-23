import { PET_NAME_MAX } from '@connecta/shared';
import { z } from 'zod';

/** Your coins and the Shop items you own (ids from SHOP_ITEMS in @connecta/shared/shop) */
export const WardrobeSchema = z
  .object({
    coins: z.number().int(),
    owned: z.array(z.string()),
    /** Your pets and their names */
    pets: z.array(z.object({ item: z.string(), coat: z.string(), name: z.string() })),
  })
  .meta({ id: 'Wardrobe' });
export type Wardrobe = z.infer<typeof WardrobeSchema>;

/** A pet's name when buying one (ignored for other items); missing = the pet's own name */
export const BuyBodySchema = z.object({ name: z.string().trim().min(1).max(PET_NAME_MAX).optional() }).meta({ id: 'BuyBody' });
