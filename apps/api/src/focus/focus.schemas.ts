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
