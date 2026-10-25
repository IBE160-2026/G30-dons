import { randomBytes } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import type { Clock } from '../clock.ts';
import type { Db, Tx } from '../db/client.ts';
import { eventHelpers, helpers, type Helper } from '../db/schema.ts';
import { DomainError } from '../domain/errors.ts';
import { getEvent } from './events.ts';

// FR-8, AD-5: the only writer of helpers and event_helpers. A helper is unique per
// (organizer, email), owns one link token and is never deleted.

export const MAX_HELPERS_PER_EVENT = 5;

export interface HelperInput {
  email: string;
  name?: string | undefined;
}

/** 24 random bytes, base64url: a 32-character token (AD-6). */
export function randomToken(): string {
  return randomBytes(24).toString('base64url');
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The name shown for a helper: her name, or her email when she has none. */
export function displayName(helper: Pick<Helper, 'name' | 'email'>): string {
  return helper.name ?? helper.email;
}

/**
 * Links a helper to the organizer's event, creating the helper on first use. The same email
 * reuses the organizer's existing helper and token. Refuses a sixth helper and a helper who is
 * already linked. Returns the helper.
 */
export async function addHelperToEvent(
  db: Db,
  clock: Clock,
  organizerId: number,
  eventId: number,
  input: HelperInput,
  newToken: () => string = randomToken,
): Promise<Helper> {
  await getEvent(db, organizerId, eventId);
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() ? input.name.trim() : null;
  const now = clock.now();

  return db.transaction(async (tx) => {
    let [helper] = await tx
      .select()
      .from(helpers)
      .where(and(eq(helpers.organizerId, organizerId), eq(helpers.email, email)));

    if (helper) {
      const [link] = await tx
        .select({ helperId: eventHelpers.helperId })
        .from(eventHelpers)
        .where(and(eq(eventHelpers.eventId, eventId), eq(eventHelpers.helperId, helper.id)));
      if (link) throw new DomainError('helper_already_on_event');
    }

    const [linked] = await tx.select({ n: count() }).from(eventHelpers).where(eq(eventHelpers.eventId, eventId));
    if ((linked?.n ?? 0) >= MAX_HELPERS_PER_EVENT) throw new DomainError('helper_limit');

    if (!helper) {
      [helper] = await tx
        .insert(helpers)
        .values({ organizerId, email, name, linkToken: newToken(), createdAt: now })
        .returning();
    } else if (helper.name === null && name !== null) {
      // A stored name is kept; a name typed now only fills an empty one.
      [helper] = await tx.update(helpers).set({ name }).where(eq(helpers.id, helper.id)).returning();
    }

    await tx.insert(eventHelpers).values({ eventId, helperId: helper!.id, createdAt: now });
    return helper!;
  });
}

/** The helpers linked to the organizer's event, in the order they were added. */
export async function listForEvent(db: Db, organizerId: number, eventId: number): Promise<Helper[]> {
  await getEvent(db, organizerId, eventId);
  const rows = await db
    .select({ helper: helpers })
    .from(eventHelpers)
    .innerJoin(helpers, eq(eventHelpers.helperId, helpers.id))
    .where(and(eq(eventHelpers.eventId, eventId), eq(helpers.organizerId, organizerId)))
    .orderBy(asc(eventHelpers.createdAt), asc(helpers.id));
  return rows.map((r) => r.helper);
}

/** One of the organizer's helpers; another organizer's id is not_found (FR-2). */
export async function getHelper(db: Db, organizerId: number, helperId: number): Promise<Helper> {
  const [row] = await db
    .select()
    .from(helpers)
    .where(and(eq(helpers.id, helperId), eq(helpers.organizerId, organizerId)));
  if (!row) throw new DomainError('not_found');
  return row;
}

/** Ids of the helpers linked to an event. Callers have already scoped the event. */
export async function eventHelperIds(db: Db | Tx, eventId: number): Promise<number[]> {
  const rows = await db
    .select({ helperId: eventHelpers.helperId })
    .from(eventHelpers)
    .where(eq(eventHelpers.eventId, eventId));
  return rows.map((r) => r.helperId);
}
