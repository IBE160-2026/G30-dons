import { randomBytes } from 'node:crypto';
import { and, asc, count, eq, ne } from 'drizzle-orm';
import type { Clock } from '../clock.ts';
import type { Db, Tx } from '../db/client.ts';
import { eventHelpers, events, type Helper, helpers, organizers, type TaskStatus, tasks } from '../db/schema.ts';
import { DomainError } from '../domain/errors.ts';
import { allowedHelperActions, type HelperAction } from '../domain/taskRules.ts';
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

    if (!helper) throw new Error('Insert returned no row');
    await tx.insert(eventHelpers).values({ eventId, helperId: helper.id, createdAt: now });
    return helper;
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

/** The only token shape randomToken makes: 24 bytes, base64url (AD-6). */
export const TOKEN_FORMAT = /^[A-Za-z0-9_-]{32}$/;

/** The helper a link token belongs to, or undefined for a malformed or unknown token. */
export async function findByToken(db: Db | Tx, token: string): Promise<Helper | undefined> {
  if (!TOKEN_FORMAT.test(token)) return undefined;
  const [row] = await db.select().from(helpers).where(eq(helpers.linkToken, token));
  return row;
}

export interface HelperPageTask {
  id: number;
  title: string;
  deadline: string;
  status: TaskStatus;
  changedSinceAnswer: boolean;
  actions: readonly HelperAction[];
}

export interface HelperPageEvent {
  id: number;
  name: string;
  eventDate: string;
  tasks: HelperPageTask[];
}

export interface HelperPage {
  token: string;
  organizerName: string;
  /** Names of the events in the header, in date order. */
  eventNames: string[];
  /** The helper's tasks (never Unassigned), grouped by event in date order, each sorted by deadline. */
  events: HelperPageEvent[];
}

/**
 * FR-12: everything the helper page shows, scoped only by the token (AD-5). Undefined for an
 * invalid link. Reads only.
 */
export async function helperPage(db: Db, token: string): Promise<HelperPage | undefined> {
  const helper = await findByToken(db, token);
  if (!helper) return undefined;

  const [organizer] = await db
    .select({ name: organizers.name })
    .from(organizers)
    .where(eq(organizers.id, helper.organizerId));

  const rows = await db
    .select({ task: tasks, event: events })
    .from(tasks)
    .innerJoin(events, eq(tasks.eventId, events.id))
    .where(
      and(eq(tasks.helperId, helper.id), ne(tasks.status, 'unassigned'), eq(events.organizerId, helper.organizerId)),
    )
    .orderBy(asc(events.eventDate), asc(events.id), asc(tasks.deadline), asc(tasks.id));

  const groups = new Map<number, HelperPageEvent>();
  for (const { task, event } of rows) {
    let group = groups.get(event.id);
    if (!group) {
      group = { id: event.id, name: event.name, eventDate: event.eventDate, tasks: [] };
      groups.set(event.id, group);
    }
    group.tasks.push({
      id: task.id,
      title: task.title,
      deadline: task.deadline,
      status: task.status,
      changedSinceAnswer: task.changedSinceAnswer,
      actions: allowedHelperActions(task),
    });
  }

  // The header names every event he is linked to, plus any event holding one of his tasks.
  const linked = await db
    .select({ id: events.id, name: events.name, eventDate: events.eventDate })
    .from(eventHelpers)
    .innerJoin(events, eq(eventHelpers.eventId, events.id))
    .where(and(eq(eventHelpers.helperId, helper.id), eq(events.organizerId, helper.organizerId)));
  const named = new Map<number, { name: string; eventDate: string }>();
  for (const e of [...linked, ...groups.values()]) named.set(e.id, { name: e.name, eventDate: e.eventDate });
  const eventNames = [...named.entries()]
    .sort(([idA, a], [idB, b]) => a.eventDate.localeCompare(b.eventDate) || idA - idB)
    .map(([, e]) => e.name);

  return { token: helper.linkToken, organizerName: organizer?.name ?? '', eventNames, events: [...groups.values()] };
}
