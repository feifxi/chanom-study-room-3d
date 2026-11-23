import { z } from 'zod';

/** Your coins and the Shop items you own (ids from SHOP_ITEMS in @connecta/shared/shop) */
export const WardrobeSchema = z.object({ coins: z.number().int(), owned: z.array(z.string()) }).meta({ id: 'Wardrobe' });
export type Wardrobe = z.infer<typeof WardrobeSchema>;
