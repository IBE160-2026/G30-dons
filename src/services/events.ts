import { and, asc, eq } from 'drizzle-orm';
import type { Clock } from '../clock.ts';
import type { Db } from '../db/client.ts';
import { type Event, events } from '../db/schema.ts';
import { isDate } from '../domain/dates.ts';
import { DomainError } from '../domain/errors.ts';
import { isTemplateKey, type Templates } from '../templates/index.ts';
import { templatePlan } from './plans.ts';
import { createPlanTasks } from './tasks.ts';

// FR-3, FR-4: events created from a template. Every query is scoped by the organizer (AD-5).

export interface EventInput {
  templateKey: string;
  name?: string | undefined;
  occasion?: string | undefined;
  location?: string | undefined;
  eventDate: string;
  guestCount?: number | undefined;
  todo?: string | undefined;
  otherInfo?: string | undefined;
}

const blankToNull = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : v.trim());

/** Creates the event and its plan's tasks in one transaction. Returns the new event id. */
export async function createEvent(
  db: Db,
  clock: Clock,
  templates: Templates,
  organizerId: number,
  input: EventInput,
): Promise<number> {
  const template = isTemplateKey(input.templateKey) ? templates.get(input.templateKey) : undefined;
  if (!template) throw new DomainError('unknown_template');
  if (!isDate(input.eventDate)) throw new DomainError('event_date_invalid');
  const today = clock.today();
  if (input.eventDate < today) throw new DomainError('event_date_in_past');

  const planned = templatePlan(template, input.eventDate, today);
  const now = clock.now();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(events)
      .values({
        organizerId,
        templateKey: template.key,
        name: blankToNull(input.name) ?? template.name,
        occasion: blankToNull(input.occasion),
        location: blankToNull(input.location),
        eventDate: input.eventDate,
        guestCount: input.guestCount ?? null,
        todo: blankToNull(input.todo),
        otherInfo: blankToNull(input.otherInfo),
        createdAt: now,
      })
      .returning({ id: events.id });
    const eventId = row!.id;
    await createPlanTasks(tx, eventId, planned, now);
    return eventId;
  });
}

/** The organizer's events, soonest first. */
export async function listEvents(db: Db, organizerId: number): Promise<Event[]> {
  return db
    .select()
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(asc(events.eventDate), asc(events.id));
}

/** One of the organizer's events; another organizer's id is not_found (FR-2). */
export async function getEvent(db: Db, organizerId: number, eventId: number): Promise<Event> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)));
  if (!row) throw new DomainError('not_found');
  return row;
}
