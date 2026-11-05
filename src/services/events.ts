import { and, asc, eq } from 'drizzle-orm';
import { draftPlan, type PlanProvider } from '../ai/index.ts';
import type { Clock } from '../clock.ts';
import type { Db } from '../db/client.ts';
import { type Event, events } from '../db/schema.ts';
import { isDate } from '../domain/dates.ts';
import { DomainError } from '../domain/errors.ts';
import { isTemplateKey, type Template, type Templates } from '../templates/index.ts';
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

/** How the plan is drafted (AD-8). `forceFailure` takes effect only in test mode (D4). */
export interface PlanOptions {
  testMode: boolean;
  provider?: PlanProvider | undefined;
  forceFailure?: boolean | undefined;
}

export interface CreatedEvent {
  eventId: number;
  /** Tells the organizer which plan she got, when it is not an AI draft. */
  notice?: string | undefined;
}

const blankToNull = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : v.trim());

/**
 * D2: the text sent to the AI, one line per filled form field that describes the event. The event
 * name is left out because it may contain the couple's names, and helper data is never part of it
 * (NFR-3).
 */
function describeEvent(template: Template, input: EventInput): string {
  const lines: [string, string | null][] = [
    ['Mal', template.name],
    ['Hva', blankToNull(input.occasion)],
    ['Hvor', blankToNull(input.location)],
    ['Antall gjester', input.guestCount === undefined ? null : String(input.guestCount)],
    ['Hva må gjøres', blankToNull(input.todo)],
    ['Annen informasjon', blankToNull(input.otherInfo)],
  ];
  return lines
    .filter((line): line is [string, string] => line[1] !== null)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

/**
 * Drafts the plan, then creates the event and its tasks in one transaction. The AI call runs
 * before the transaction (AD-8), and every task starts Unassigned (AD-2).
 */
export async function createEvent(
  db: Db,
  clock: Clock,
  templates: Templates,
  organizerId: number,
  input: EventInput,
  plan: PlanOptions,
): Promise<CreatedEvent> {
  const template = isTemplateKey(input.templateKey) ? templates.get(input.templateKey) : undefined;
  if (!template) throw new DomainError('unknown_template');
  if (!isDate(input.eventDate)) throw new DomainError('event_date_invalid');
  const today = clock.today();
  if (input.eventDate < today) throw new DomainError('event_date_in_past');

  const drafted = await draftPlan(
    {
      templateKey: template.key,
      eventDate: input.eventDate,
      description: describeEvent(template, input),
      forceFailure: plan.forceFailure ?? false,
    },
    { templates, today, testMode: plan.testMode, provider: plan.provider },
  );
  const now = clock.now();

  const eventId = await db.transaction(async (tx) => {
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
    if (!row) throw new Error('Insert returned no row');
    const eventId = row.id;
    await createPlanTasks(tx, eventId, drafted.tasks, now);
    return eventId;
  });
  return { eventId, notice: drafted.notice };
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
