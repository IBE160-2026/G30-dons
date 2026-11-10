import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { type OutboxEmail, outboxEmails } from '../db/schema.ts';

// AD-9, FR-24: the test inbox. In test mode every email is stored here instead of being sent.

export type OutboxInsert = Omit<OutboxEmail, 'id'>;

export async function insertOutbox(db: Db, email: OutboxInsert): Promise<void> {
  await db.insert(outboxEmails).values(email);
}

/** The organizer's own emails, newest first (AD-5: scoped by the organizer id from the session). */
export async function listOutbox(db: Db, organizerId: number): Promise<OutboxEmail[]> {
  return db
    .select()
    .from(outboxEmails)
    .where(eq(outboxEmails.organizerId, organizerId))
    .orderBy(desc(outboxEmails.createdAt), desc(outboxEmails.id));
}
