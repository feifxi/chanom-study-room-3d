import { index, jsonb, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core';

/** Anonymous visitors, keyed by the random id their browser keeps. */
export const visitors = pgTable('visitors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  look: jsonb('look'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One continuous stretch of focus (room or personal pomodoro). */
export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: serial('id').primaryKey(),
    visitorId: text('visitor_id')
      .notNull()
      .references(() => visitors.id, { onDelete: 'cascade' }),
    roomLabel: text('room_label').notNull(),
    subject: text('subject').notNull().default(''),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    minutes: real('minutes').notNull(),
  },
  (t) => [index('focus_visitor_started_idx').on(t.visitorId, t.startedAt), index('focus_started_idx').on(t.startedAt)],
);
