import { z } from 'zod';

/** Your Connecta Plus (docs/features/15-plus.md) */
export const PlusStatusSchema = z
  .object({
    plus: z.boolean(),
    /** When it runs until (null: never had it) */
    until: z.string().nullable(),
  })
  .meta({ id: 'PlusStatus' });
export type PlusStatus = z.infer<typeof PlusStatusSchema>;

/** Local testing: Plus (a month, card), cancelled (ends in 2 days), ended 2 days ago (grace), or Free */
export const DEV_PLUS_STATES = ['plus', 'cancelled', 'grace', 'free'] as const;
export const DevPlusBodySchema = z.object({ state: z.enum(DEV_PLUS_STATES) }).meta({ id: 'DevPlusBody' });
