import { isTimeZone } from '@connecta/shared';
import { z } from 'zod';
import { PersonSchema } from '../rooms/rooms.schemas.js';

/** An IANA time zone this server knows, e.g. Asia/Bangkok */
export const TimeZoneSchema = z.string().max(64).refine(isTimeZone, 'Unknown time zone');

export const TodayQuerySchema = z.object({ tz: TimeZoneSchema.default('UTC') });

/** One person's focus in a room today. */
export const FocusRowSchema = z.object({ person: PersonSchema, minutes: z.number().int() }).meta({ id: 'FocusRow' });
export type FocusRow = z.infer<typeof FocusRowSchema>;

/** "Focus in this room today": members' saved rounds, most first (guests and live rounds come from the game server). */
export const RoomTodaySchema = z.object({ rows: z.array(FocusRowSchema) }).meta({ id: 'RoomToday' });
export type RoomToday = z.infer<typeof RoomTodaySchema>;

export const TimeZoneBodySchema = z.object({ timeZone: TimeZoneSchema });

/** Your own numbers (only you): the last 7 days in your time zone, oldest first. */
export const MyFocusSchema = z
  .object({
    today: z.number().int(),
    week: z.number().int(),
    /** Over the days you focused */
    dailyAverage: z.number().int(),
    days: z.array(z.object({ date: z.string(), minutes: z.number().int() })),
    /** Subjects typed alike (case, spaces) count together, under the spelling you used most; '' is "No subject" */
    subjects: z.array(z.object({ name: z.string(), minutes: z.number().int() })),
  })
  .meta({ id: 'MyFocus' });
export type MyFocus = z.infer<typeof MyFocusSchema>;

export const RANK_SCOPES = ['friends', 'everyone'] as const;
export const RANK_PERIODS = ['today', 'week'] as const;
export const RankingQuerySchema = z.object({
  scope: z.enum(RANK_SCOPES),
  period: z.enum(RANK_PERIODS),
  tz: TimeZoneSchema.default('UTC'),
});

/** A ranking: Friends (you and friends who focused) or Everyone (the top 10 of those listed). Ties share a rank. */
export const RankingSchema = z
  .object({
    rows: z.array(z.object({ rank: z.number().int(), person: PersonSchema, minutes: z.number().int() })),
    /** Your place: null on Everyone while you're not listed; rank null with no minutes yet */
    me: z.object({ rank: z.number().int().nullable(), minutes: z.number().int() }).nullable(),
    /** Friends: how many haven't focused in this period (they're left out of the list) */
    idleFriends: z.number().int(),
  })
  .meta({ id: 'Ranking' });
export type Ranking = z.infer<typeof RankingSchema>;
