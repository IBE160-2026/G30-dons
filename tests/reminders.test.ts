import { mkdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { remindersSent } from '../src/db/schema.ts';
import { type MailMessage, send } from '../src/mail/index.ts';
import { listOutbox } from '../src/mail/outbox.ts';
import { run } from '../src/services/reminders.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { setupTestApp, type TestContext } from './helpers.ts';
import { acceptedScenario, assign, at, eventTasks, helperAnswer, setTiming, taskById } from './reminderScenario.ts';

// FR-17, FR-18, FR-24, AD-7, AD-9 (story 3.1): services/reminders.run claims each due reminder in
// reminders_sent before sending it. The yes is given at the fixed test clock (2026-11-01, Oslo), and
// each run happens at a simulated later time, so the 14-day point is 2026-11-15.

let ctx: TestContext;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp({ APP_BASE_URL: 'https://masterplan.example.no' });
  // run and send log one line per run and per failure; keep the test output clean.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  ctx.close();
});

const realDeps = () => ({ db: ctx.db, config: ctx.config, send });

async function runAt(timestamp: string, deps = realDeps()) {
  const { now, today } = at(timestamp);
  return run(deps, now, today);
}

const claims = () => ctx.db.select().from(remindersSent).orderBy(remindersSent.id);

describe('timing through the service', () => {
  it('sends nothing the day before the 14-day point and one reminder on it', async () => {
    const { organizerId, accepted } = await acceptedScenario(ctx);
    expect(await runAt('2026-11-14T08:00:00.000Z')).toEqual([]);
    expect(await runAt('2026-11-15T08:00:00.000Z')).toEqual([{ organizerId, taskId: accepted[0]!.id }]);
  });

  it('sends on deadline − 3 when that comes first', async () => {
    const { accepted } = await acceptedScenario(ctx);
    await setTiming(ctx, accepted[0]!.id, { deadline: '2026-11-10' });
    expect(await runAt('2026-11-06T08:00:00.000Z')).toEqual([]);
    expect(await runAt('2026-11-07T08:00:00.000Z')).toHaveLength(1);
  });

  it('never sends when the yes came after the 3-day point', async () => {
    const { accepted } = await acceptedScenario(ctx);
    await setTiming(ctx, accepted[0]!.id, { deadline: '2026-11-03' });
    for (const ts of ['2026-11-01T12:00:00.000Z', '2026-11-03T08:00:00.000Z', '2026-11-30T08:00:00.000Z']) {
      expect(await runAt(ts)).toEqual([]);
    }
    expect(await claims()).toEqual([]);
  });

  it('only reminds Accepted tasks, not Open, Declined, Done, Can’t be done or Unassigned ones', async () => {
    const { agent, eventId, helper, accepted, others } = await acceptedScenario(ctx);
    const [open, declined, done, cantDo] = others;
    for (const task of [open!, declined!, done!, cantDo!]) await assign(agent, eventId, task.id, helper.id);
    await helperAnswer(ctx, helper.linkToken, declined!.id, 'no');
    for (const task of [done!, cantDo!]) await helperAnswer(ctx, helper.linkToken, task.id, 'yes');
    await helperAnswer(ctx, helper.linkToken, done!.id, 'done');
    await helperAnswer(ctx, helper.linkToken, cantDo!.id, 'cantDo');
    for (const task of await eventTasks(ctx, eventId)) await setTiming(ctx, task.id, { deadline: '2026-12-31' });

    const sent = await runAt('2026-12-20T08:00:00.000Z');
    expect(sent.map((s) => s.taskId)).toEqual([accepted[0]!.id]);
  });
});

describe('at most once, never lost', () => {
  it('sends one reminder per yes, however often the check runs', async () => {
    const { accepted } = await acceptedScenario(ctx);
    expect(await runAt('2026-11-15T08:00:00.000Z')).toHaveLength(1);
    expect(await runAt('2026-11-15T08:10:00.000Z')).toEqual([]);
    expect(await runAt('2026-11-20T08:00:00.000Z')).toEqual([]);
    const rows = await claims();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ taskId: accepted[0]!.id, acceptedAt: accepted[0]!.acceptedAt });
  });

  it('catches up when the check runs days late, sending each missed reminder once', async () => {
    await acceptedScenario(ctx, { accepted: 2 });
    expect(await runAt('2026-11-25T08:00:00.000Z')).toHaveLength(2);
    expect(await runAt('2026-11-26T08:00:00.000Z')).toEqual([]);
  });

  it('sends a late reminder for a passed deadline while the task is still Accepted (D5)', async () => {
    const { accepted } = await acceptedScenario(ctx);
    await setTiming(ctx, accepted[0]!.id, { deadline: '2026-11-10' });
    expect(await runAt('2026-11-20T08:00:00.000Z')).toHaveLength(1);
  });

  it('sends a new reminder for a new yes (a new accepted_at)', async () => {
    const { accepted } = await acceptedScenario(ctx);
    const taskId = accepted[0]!.id;
    expect(await runAt('2026-11-15T08:00:00.000Z')).toHaveLength(1);
    // A later yes, as when Ola changes his answer back (story 3.3).
    await setTiming(ctx, taskId, { acceptedAt: '2026-11-20T09:00:00.000Z' });
    expect(await runAt('2026-12-03T08:00:00.000Z')).toEqual([]);
    expect(await runAt('2026-12-04T08:00:00.000Z')).toHaveLength(1);
    expect((await claims()).map((r) => r.acceptedAt)).toEqual([accepted[0]!.acceptedAt, '2026-11-20T09:00:00.000Z']);
  });

  it('releases the claim when sending fails, still sends the others, and retries on the next run', async () => {
    const { accepted } = await acceptedScenario(ctx, { accepted: 2 });
    const [failing, working] = accepted;
    const flaky = vi.fn(async (...args: Parameters<typeof send>) => {
      const message: MailMessage = args[2];
      if (message.text.includes(failing!.title)) throw new Error('smtp down');
      return send(...args);
    });

    const first = await runAt('2026-11-15T08:00:00.000Z', { ...realDeps(), send: flaky });
    expect(first.map((s) => s.taskId)).toEqual([working!.id]);
    expect((await claims()).map((r) => r.taskId)).toEqual([working!.id]);
    // One log line for the failure (AD-7), as a warning or an error.
    expect(vi.mocked(console.error).mock.calls.length + vi.mocked(console.warn).mock.calls.length).toBeGreaterThan(0);

    const second = await runAt('2026-11-16T08:00:00.000Z');
    expect(second.map((s) => s.taskId)).toEqual([failing!.id]);
    expect((await claims()).map((r) => r.taskId).sort()).toEqual([failing!.id, working!.id].sort());
  });

  it('sends nothing and claims nothing with MAIL_TRANSPORT=disabled and test mode off (D4)', async () => {
    const { organizerId } = await acceptedScenario(ctx, { accepted: 2 });
    const config = loadConfig({
      TEST_MODE: 'false',
      DATABASE_URL: ctx.config.databaseUrl,
      SESSION_SECRET: 'a-random-secret-that-is-long-enough-1234',
      APP_BASE_URL: 'https://masterplan.example.no',
      MAIL_TRANSPORT: 'disabled',
    });
    const spy = vi.fn(send);
    expect(await runAt('2026-11-20T08:00:00.000Z', { db: ctx.db, config, send: spy })).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    expect(await claims()).toEqual([]);
    expect(await listOutbox(ctx.db, organizerId)).toEqual([]);
  });

  it('removes the claims when the task is deleted (cascade)', async () => {
    const { agent, eventId, accepted } = await acceptedScenario(ctx);
    await runAt('2026-11-15T08:00:00.000Z');
    await agent.post(`/events/${eventId}/tasks/${accepted[0]!.id}/delete`).type('form').send({});
    expect(await claims()).toEqual([]);
  });
});

describe('the email in the test inbox', () => {
  it('stores recipient, sender, reply-to, subject, text, link, kind and time for the organizer', async () => {
    const { organizerId, helper, accepted } = await acceptedScenario(ctx);
    const { now } = at('2026-11-15T08:00:00.000Z');
    await runAt(now);

    const rows = await listOutbox(ctx.db, organizerId);
    expect(rows).toHaveLength(1);
    const task = await taskById(ctx, accepted[0]!.id);
    expect(rows[0]).toMatchObject({
      to: 'ola@example.no',
      fromName: 'MasterPlan på vegne av Kari',
      replyTo: 'kari@example.no',
      subject: 'Påminnelse om oppgaven fra Kari',
      links: [`https://masterplan.example.no/h/${helper.linkToken}?view=accepted`],
      kind: 'reminder',
      createdAt: now,
    });
    expect(rows[0]!.text).toContain(`«${task.title}»`);
    expect(rows[0]!.text).toContain('31. desember 2026');
  });

  it('writes one email per task, never bundled', async () => {
    const { organizerId } = await acceptedScenario(ctx, { accepted: 3 });
    await runAt('2026-11-15T08:00:00.000Z');
    expect(await listOutbox(ctx.db, organizerId)).toHaveLength(3);
  });

  it('keeps each organizer’s emails apart', async () => {
    const kari = await acceptedScenario(ctx);
    const eva = await acceptedScenario(ctx, {
      organizer: { name: 'Eva', email: 'eva@example.no' },
      helper: { name: 'Lars', email: 'lars@example.no' },
    });
    await runAt('2026-11-15T08:00:00.000Z');
    expect((await listOutbox(ctx.db, kari.organizerId)).map((r) => r.to)).toEqual(['ola@example.no']);
    expect((await listOutbox(ctx.db, eva.organizerId)).map((r) => r.to)).toEqual(['lars@example.no']);
  });
});
