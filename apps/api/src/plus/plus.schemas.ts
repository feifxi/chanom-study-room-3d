import { z } from 'zod';

/** Your Connecta Plus (spec 15) */
export const PlusStatusSchema = z
  .object({
    plus: z.boolean(),
    /** When it runs until (null: never had it) */
    until: z.string().nullable(),
  })
  .meta({ id: 'PlusStatus' });
export type PlusStatus = z.infer<typeof PlusStatusSchema>;

export const DevPlusBodySchema = z.object({ on: z.boolean() }).meta({ id: 'DevPlusBody' });
