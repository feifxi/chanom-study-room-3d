import { boolean, index, jsonb, pgTable, real, serial, smallint, text, timestamp } from 'drizzle-orm/pg-core';

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

/** One stay in a room, from joining to leaving (leftAt is null while they're still there). */
export const visits = pgTable(
  'visits',
  {
    id: serial('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    roomLabel: text('room_label').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (t) => [index('visits_joined_idx').on(t.joinedAt)],
);

/** What someone thought, asked when they leave a room. Anonymous apart from the nickname they chose. */
export const feedback = pgTable(
  'feedback',
  {
    id: serial('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    name: text('name').notNull(),
    /** 1 (didn't like it) … 5 (loved it) */
    rating: smallint('rating').notNull(),
    comment: text('comment').notNull().default(''),
    /** e.g. ["bug", "idea", "love"] */
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    roomLabel: text('room_label').notNull().default(''),
    minutesInRoom: real('minutes_in_room').notNull().default(0),
    usedVoice: boolean('used_voice').notNull().default(false),
    userAgent: text('user_agent').notNull().default(''),
    viewport: text('viewport').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('feedback_created_idx').on(t.createdAt)],
);
