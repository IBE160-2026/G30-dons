import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
