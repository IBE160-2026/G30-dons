import { and, asc, eq, ne } from 'drizzle-orm';
import type { Clock } from '../clock.ts';
import type { Db, Tx } from '../db/client.ts';
import { events, messages, type Task, tasks } from '../db/schema.ts';
import { isDate } from '../domain/dates.ts';
import { DomainError } from '../domain/errors.ts';
import type { PlannedTask } from '../domain/plan.ts';
import { type Actor, type HelperAction, type TaskCommand, transition } from '../domain/taskRules.ts';
import { eventHelperIds, findByToken } from './helpers.ts';

// AD-2: the only writer of task and message rows. Every function is scoped by the organizer (AD-5), except
// listForHelper, which is scoped by the helper (helper requests go by token, never the session).

export interface TaskInput {
  title: string;
  deadline: string;
}

/** Inserts a plan's tasks inside the caller's transaction. Every task starts Unassigned. */
export async function createPlanTasks(tx: Tx, eventId: number, planned: readonly PlannedTask[], now: string) {
  if (planned.length === 0) return;
  await tx.insert(tasks).values(
    planned.map((t) => ({
      eventId,
      title: t.title,
      deadline: t.deadline,
      status: 'unassigned' as const,
      createdAt: now,
    })),
  );
}

async function assertOwnsEvent(db: Db, organizerId: number, eventId: number): Promise<void> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)));
  if (!row) throw new DomainError('not_found');
}

/** One task of the organizer's event; anything else is not_found (FR-2). */
export async function getTask(db: Db, organizerId: number, eventId: number, taskId: number): Promise<Task> {
  const [row] = await db
    .select({ task: tasks })
    .from(tasks)
    .innerJoin(events, eq(tasks.eventId, events.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.eventId, eventId), eq(events.organizerId, organizerId)));
  if (!row) throw new DomainError('not_found');
  return row.task;
}

function checkDeadline(deadline: string, today: string, previous?: string): void {
  if (!isDate(deadline)) throw new DomainError('deadline_invalid');
  // An unchanged old deadline may stay, so a task can be renamed after its date has passed.
  if (deadline !== previous && deadline < today) throw new DomainError('deadline_in_past');
}

/** The event's tasks sorted by deadline, then by creation order. */
export async function listForEvent(db: Db, organizerId: number, eventId: number): Promise<Task[]> {
  await assertOwnsEvent(db, organizerId, eventId);
  return db.select().from(tasks).where(eq(tasks.eventId, eventId)).orderBy(asc(tasks.deadline), asc(tasks.id));
}

export async function addTask(db: Db, clock: Clock, organizerId: number, eventId: number, input: TaskInput) {
  await assertOwnsEvent(db, organizerId, eventId);
  checkDeadline(input.deadline, clock.today());
  const [row] = await db
    .insert(tasks)
    .values({
      eventId,
      title: input.title.trim(),
      deadline: input.deadline,
      status: 'unassigned',
      createdAt: clock.now(),
    })
    .returning({ id: tasks.id });
  return row!.id;
}

export async function updateTask(
  db: Db,
  clock: Clock,
  organizerId: number,
  eventId: number,
  taskId: number,
  input: TaskInput,
): Promise<void> {
  const task = await getTask(db, organizerId, eventId, taskId);
  checkDeadline(input.deadline, clock.today(), task.deadline);
  const title = input.title.trim();
  // AD-13: the helper said yes to something else, so flag it; the status stays Accepted.
  const changed = title !== task.title || input.deadline !== task.deadline;
  await db
    .update(tasks)
    .set({
      title,
      deadline: input.deadline,
      ...(task.status === 'accepted' && changed ? { changedSinceAnswer: true } : {}),
    })
    .where(eq(tasks.id, task.id));
}

export async function deleteTask(db: Db, organizerId: number, eventId: number, taskId: number): Promise<void> {
  const task = await getTask(db, organizerId, eventId, taskId);
  await db.delete(tasks).where(eq(tasks.id, task.id));
}

export type ApplyResult = 'changed' | 'messageOnly' | 'noop';

/**
 * AD-2: the one entry point for status changes. Loads the task scoped by the actor's organizer,
 * asks taskRules.transition and writes the changes, all in one transaction. A refused move
 * throws its DomainError; a task outside the organizer's events is not_found.
 */
export async function apply(
  db: Db,
  actor: Actor,
  taskId: number,
  command: TaskCommand,
  now: string,
): Promise<ApplyResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ task: tasks })
      .from(tasks)
      .innerJoin(events, eq(tasks.eventId, events.id))
      .where(and(eq(tasks.id, taskId), eq(events.organizerId, actor.organizerId)));
    if (!row) throw new DomainError('not_found');
    const task = row.task;

    const decision = transition(task, command, actor, await eventHelperIds(tx, task.eventId), now);
    if (decision.kind === 'refused') throw new DomainError(decision.code);
    if (decision.kind === 'noop') return 'noop';

    const message = decision.message;
    const changes = decision.kind === 'change' ? decision.changes : {};
    // A helper command that does something clears the changed-task flag (AD-13).
    const flag = actor.kind === 'helper' ? { changedSinceAnswer: false } : {};
    if (Object.keys(changes).length > 0 || actor.kind === 'helper') {
      await tx
        .update(tasks)
        .set({ ...changes, ...flag })
        .where(eq(tasks.id, task.id));
    }
    // Exactly one messages row per helper command that does something; organizer commands write none.
    if (actor.kind === 'helper' && message) {
      await tx.insert(messages).values({
        taskId: task.id,
        helperId: actor.helperId,
        action: message.action,
        statusAfter: message.statusAfter,
        body: message.body,
        createdAt: now,
        seenAt: null,
      });
    }
    return decision.kind === 'change' ? 'changed' : 'messageOnly';
  });
}

/**
 * A helper's command from the helper page, scoped only by the link token (AD-5, AD-6). Returns
 * 'invalidLink' for a malformed or unknown token. A task that is not the helper's, a move the
 * rules refuse, or a task id that does not exist throws a DomainError.
 */
export async function applyAsHelper(
  db: Db,
  token: string,
  taskId: number,
  command: { action: HelperAction; message?: string | undefined },
  now: string,
): Promise<ApplyResult | 'invalidLink'> {
  const helper = await findByToken(db, token);
  if (!helper) return 'invalidLink';
  const actor: Actor = { kind: 'helper', helperId: helper.id, organizerId: helper.organizerId };
  const { action, message } = command;
  return apply(db, actor, taskId, message === undefined ? { action } : { action, message }, now);
}

/** A helper's tasks, except Unassigned ones, sorted by deadline (FR-11). */
export async function listForHelper(db: Db, helperId: number): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.helperId, helperId), ne(tasks.status, 'unassigned')))
    .orderBy(asc(tasks.deadline), asc(tasks.id));
}
