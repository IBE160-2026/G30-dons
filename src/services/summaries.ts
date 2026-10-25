import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { type Event, events, type Task, tasks } from '../db/schema.ts';
import { type EventSummary, eventSummary as summarize } from '../domain/status.ts';
import { getEvent, listEvents } from './events.ts';
import { countNew, countNewByEvent } from './messages.ts';

// FR-19, FR-20: what needs attention, per event. Every derived state comes from domain/status.ts
// (AD-3), recomputed against today on each call. Reads only; scoped by the organizer (AD-5).

export interface OverviewRow {
  event: Event;
  summary: EventSummary<Task>;
  newReplies: number;
}

/** One summary per event of the organizer, soonest event first. */
export async function overviewSummaries(db: Db, organizerId: number, today: string): Promise<OverviewRow[]> {
  const [allEvents, rows, newCounts] = await Promise.all([
    listEvents(db, organizerId),
    db
      .select({ task: tasks })
      .from(tasks)
      .innerJoin(events, eq(tasks.eventId, events.id))
      .where(eq(events.organizerId, organizerId))
      .orderBy(asc(tasks.deadline), asc(tasks.id)),
    countNewByEvent(db, organizerId),
  ]);
  const byEvent = new Map<number, Task[]>();
  for (const { task } of rows) {
    const list = byEvent.get(task.eventId) ?? [];
    list.push(task);
    byEvent.set(task.eventId, list);
  }
  // Upcoming events (today or later) soonest first, then past events most recent first.
  const upcoming = allEvents.filter((e) => e.eventDate >= today);
  const past = allEvents.filter((e) => e.eventDate < today).reverse();
  return [...upcoming, ...past].map((event) => ({
    event,
    summary: summarize(byEvent.get(event.id) ?? [], event, today),
    newReplies: newCounts.get(event.id) ?? 0,
  }));
}

export interface EventSummaryResult {
  summary: EventSummary<Task>;
  newReplies: number;
}

/** The summary of one of the organizer's events; another organizer's event is not_found. */
export async function loadEventSummary(
  db: Db,
  organizerId: number,
  eventId: number,
  today: string,
): Promise<EventSummaryResult> {
  const event = await getEvent(db, organizerId, eventId);
  const [eventTasks, newReplies] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.eventId, event.id)).orderBy(asc(tasks.deadline), asc(tasks.id)),
    countNew(db, organizerId, event.id),
  ]);
  return { summary: summarize(eventTasks, event, today), newReplies };
}
