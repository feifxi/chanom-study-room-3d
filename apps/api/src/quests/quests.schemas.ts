import { z } from 'zod';

export const QuestViewSchema = z
  .object({
    id: z.string(),
    emoji: z.string(),
    title: z.string(),
    goal: z.number().int(),
    unit: z.string().optional(),
    coins: z.number().int(),
    progress: z.number().int(),
  })
  .meta({ id: 'QuestView' });

/** Your three quests today (in your time zone) and your coins */
export const QuestsTodaySchema = z
  .object({
    /** yyyy-mm-dd in your time zone */
    day: z.string(),
    coins: z.number().int(),
    quests: z.array(QuestViewSchema),
  })
  .meta({ id: 'QuestsToday' });
export type QuestsToday = z.infer<typeof QuestsTodaySchema>;
