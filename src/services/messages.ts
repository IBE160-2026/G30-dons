import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { events, helpers, messages, tasks, type MessageAction, type TaskStatus } from '../db/schema.ts';
import { DomainError } from '../domain/errors.ts';
import { displayName } from './helpers.ts';

// AD-15: a New reply is a messages row with seen_at = null. Replies become seen only through
// listAndMarkSeen, called by GET /events/:id?panel=messages, which marks exactly the rows it returns.
// Setting seen_at here is the AD-15 exception to "only services/tasks writes messages".
// Every query is scoped by the organizer (AD-5).

/** At most this many replies are listed (and so marked seen) at a time. */
export const MAX_LISTED_REPLIES = 50;

export interface Reply {
  id: number;
  helperName: string;
  taskTitle: string;
  action: MessageAction;
  statusAfter: TaskStatus;
  body: string | null;
  createdAt: string;
  /** The reply was unseen when it was listed. */
  isNew: boolean;
}

const ownedEvent = (organizerId: number, eventId: number) =>
  and(eq(events.id, eventId), eq(events.organizerId, organizerId));

/** The number of New replies on the organizer's event. Reads only. */
export async function countNew(db: Db, organizerId: number, eventId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(tasks, eq(messages.taskId, tasks.id))
    .innerJoin(events, eq(tasks.eventId, events.id))
    .where(and(ownedEvent(organizerId, eventId), isNull(messages.seenAt)));
  return row?.n ?? 0;
}

/** New reply counts for all the organizer's events, by event id (events without any are left out). */
export async function countNewByEvent(db: Db, organizerId: number): Promise<Map<number, number>> {
  const rows = await db
    .select({ eventId: tasks.eventId, n: count() })
    .from(messages)
    .innerJoin(tasks, eq(messages.taskId, tasks.id))
    .innerJoin(events, eq(tasks.eventId, events.id))
    .where(and(eq(events.organizerId, organizerId), isNull(messages.seenAt)))
    .groupBy(tasks.eventId);
  return new Map(rows.map((r) => [r.eventId, r.n]));
}

/**
 * The event's replies (at most 50): unseen ones first, then seen ones, each newest first. Marks the
 * unseen ones among them seen, in one transaction, so repeated openings clear every New reply. Another organizer's event is not_found and marks nothing.
 */
export async function listAndMarkSeen(db: Db, organizerId: number, eventId: number, now: string): Promise<Reply[]> {
  return db.transaction(async (tx) => {
    const [event] = await tx.select({ id: events.id }).from(events).where(ownedEvent(organizerId, eventId));
    if (!event) throw new DomainError('not_found');

    const rows = await tx
      .select({ message: messages, helper: { name: helpers.name, email: helpers.email }, taskTitle: tasks.title })
      .from(messages)
      .innerJoin(tasks, eq(messages.taskId, tasks.id))
      .innerJoin(events, eq(tasks.eventId, events.id))
      .innerJoin(helpers, eq(messages.helperId, helpers.id))
      .where(ownedEvent(organizerId, eventId))
      .orderBy(desc(sql`(${messages.seenAt} IS NULL)`), desc(messages.createdAt), desc(messages.id))
      .limit(MAX_LISTED_REPLIES);

    const unseenIds = rows.filter((r) => r.message.seenAt === null).map((r) => r.message.id);
    if (unseenIds.length > 0) {
      await tx
        .update(messages)
        .set({ seenAt: now })
        .where(and(inArray(messages.id, unseenIds), isNull(messages.seenAt)));
    }

    return rows.map(({ message, helper, taskTitle }) => ({
      id: message.id,
      helperName: displayName(helper),
      taskTitle,
      action: message.action,
      statusAfter: message.statusAfter,
      body: message.body,
      createdAt: message.createdAt,
      isNew: message.seenAt === null,
    }));
  });
}
