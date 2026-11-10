import { eq } from 'drizzle-orm';
import request from 'supertest';
import { fixedClock } from '../src/clock.ts';
import { events, type Helper, helpers, type Task, tasks } from '../src/db/schema.ts';
import type { TestContext } from './helpers.ts';

// Story 3.1: shared set-up for the reminder tests. State is built through the HTTP routes at the
// fixed test clock (2026-11-01); the yes date and deadline are then set directly, so each test can
// place the 14-day and 3-day points exactly and run the check at a simulated later time.

export type Agent = ReturnType<typeof request.agent>;

/** A simulated moment: `now` (UTC ISO) and `today` (the Oslo date), from a fixed clock. */
export function at(timestamp: string): { now: string; today: string } {
  const clock = fixedClock(timestamp);
  return { now: clock.now(), today: clock.today() };
}

export async function registerOrganizer(ctx: TestContext, name: string, email: string): Promise<Agent> {
  const agent = request.agent(ctx.app);
  await agent.post('/registrer').type('form').send({ name, email, password: 'hemmelig123' });
  return agent;
}

export async function createWedding(agent: Agent, eventDate = '2027-03-01'): Promise<number> {
  const res = await agent.post('/events').type('form').send({ templateKey: 'wedding', eventDate });
  const match = /^\/events\/(\d+)$/.exec(res.headers.location ?? '');
  if (!match) throw new Error('event not created');
  return Number(match[1]);
}

export async function addHelper(
  ctx: TestContext,
  agent: Agent,
  eventId: number,
  email: string,
  name?: string,
): Promise<Helper> {
  await agent
    .post(`/events/${eventId}/helpers`)
    .type('form')
    .send(name ? { email, name } : { email });
  const [helper] = await ctx.db.select().from(helpers).where(eq(helpers.email, email));
  if (!helper) throw new Error('helper not added');
  return helper;
}

export async function assign(agent: Agent, eventId: number, taskId: number, helperId: number): Promise<void> {
  await agent
    .post(`/events/${eventId}/tasks/${taskId}/assign`)
    .type('form')
    .send({ helperId: String(helperId) });
}

export async function helperAnswer(
  ctx: TestContext,
  token: string,
  taskId: number,
  action: 'yes' | 'no' | 'done' | 'cantDo',
): Promise<void> {
  await request(ctx.app).post(`/h/${token}/tasks/${taskId}`).type('form').send({ action });
}

export async function eventTasks(ctx: TestContext, eventId: number): Promise<Task[]> {
  return ctx.db.select().from(tasks).where(eq(tasks.eventId, eventId)).orderBy(tasks.id);
}

export async function taskById(ctx: TestContext, taskId: number): Promise<Task> {
  const [task] = await ctx.db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error(`task ${taskId} not found`);
  return task;
}

/** Simulates when the yes was given and moves the deadline, so the reminder rule can be placed exactly. */
export async function setTiming(
  ctx: TestContext,
  taskId: number,
  timing: { acceptedAt?: string; deadline?: string },
): Promise<void> {
  await ctx.db.update(tasks).set(timing).where(eq(tasks.id, taskId));
}

export interface ScenarioOptions {
  /** How many of the event's first tasks the helper has said yes to. */
  accepted?: number;
  organizer?: { name: string; email: string };
  helper?: { name: string | undefined; email: string };
}

/**
 * An organizer with one Wedding event, one helper on it, and `accepted` tasks the helper has said
 * yes to at the fixed test clock. Every accepted task gets the deadline 2026-12-31 unless a test
 * moves it. Defaults: Kari, Ola, one task.
 */
export async function acceptedScenario(ctx: TestContext, options: ScenarioOptions = {}) {
  const { accepted = 1 } = options;
  const organizer = options.organizer ?? { name: 'Kari', email: 'kari@example.no' };
  const helperInput = options.helper ?? { name: 'Ola', email: 'ola@example.no' };
  const agent = await registerOrganizer(ctx, organizer.name, organizer.email);
  const eventId = await createWedding(agent);
  const helper = await addHelper(ctx, agent, eventId, helperInput.email, helperInput.name);
  const all = await eventTasks(ctx, eventId);
  const acceptedTasks = all.slice(0, accepted);
  for (const task of acceptedTasks) {
    await assign(agent, eventId, task.id, helper.id);
    await helperAnswer(ctx, helper.linkToken, task.id, 'yes');
    await setTiming(ctx, task.id, { deadline: '2026-12-31' });
  }
  const [event] = await ctx.db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new Error('event not found');
  return {
    agent,
    eventId,
    organizerId: event.organizerId,
    helper,
    accepted: await Promise.all(acceptedTasks.map((t) => taskById(ctx, t.id))),
    others: all.slice(accepted),
  };
}
