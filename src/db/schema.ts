import { integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

// AD-14: the one schema file. Timestamps are UTC ISO strings set by services from the clock (AD-4),
// so no column has a SQL default.

export const organizers = sqliteTable('organizers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

export type Organizer = typeof organizers.$inferSelect;

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizerId: integer('organizer_id')
    .notNull()
    .references(() => organizers.id),
  templateKey: text('template_key').notNull(),
  name: text('name').notNull(),
  occasion: text('occasion'),
  location: text('location'),
  eventDate: text('event_date').notNull(),
  guestCount: integer('guest_count'),
  todo: text('todo'),
  otherInfo: text('other_info'),
  createdAt: text('created_at').notNull(),
});

export type Event = typeof events.$inferSelect;

// AD-5: a helper is unique per (organizer, email) and owns one link token. Rows are never deleted.
export const helpers = sqliteTable(
  'helpers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    organizerId: integer('organizer_id')
      .notNull()
      .references(() => organizers.id),
    email: text('email').notNull(),
    name: text('name'),
    linkToken: text('link_token').notNull().unique(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [unique('helpers_organizer_email_unique').on(t.organizerId, t.email)],
);

export type Helper = typeof helpers.$inferSelect;

// An event links to at most five helpers (checked in services/helpers).
export const eventHelpers = sqliteTable(
  'event_helpers',
  {
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    helperId: integer('helper_id')
      .notNull()
      .references(() => helpers.id),
    createdAt: text('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.helperId] })],
);

export const TASK_STATUSES = ['unassigned', 'open', 'accepted', 'declined', 'done', 'cant_do'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  deadline: text('deadline').notNull(),
  status: text('status', { enum: TASK_STATUSES }).notNull(),
  helperId: integer('helper_id').references(() => helpers.id),
  assignedAt: text('assigned_at'),
  acceptedAt: text('accepted_at'),
  createdAt: text('created_at').notNull(),
});

export type Task = typeof tasks.$inferSelect;
