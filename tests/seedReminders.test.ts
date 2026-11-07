import { mkdirSync } from 'node:fs';
import { inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPECTED_REMINDERS_DUE } from '../seed/fixture.ts';
import { type SeedResult, seed } from '../seed/seed.ts';
import { fixedClock } from '../src/clock.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { tasks } from '../src/db/schema.ts';
import { addDays } from '../src/domain/dates.ts';
import { send } from '../src/mail/index.ts';
import { listOutbox } from '../src/mail/outbox.ts';
import { run } from '../src/services/reminders.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { setupTestApp, type TestContext } from './helpers.ts';

// FR-25, FR-17 (story 3.1, AC 7): straight after seeding, «Send påminnelser nå» sends the reminders
// the fixture promises: 2 for the Wedding (Bestille kake, Planlegge bordplassering) and 10 for the
// Bachelorette party (every task Accepted 18 days ago). A separate file from tests/seed.test.ts, so
// the existing seed tests keep running while src/services/reminders.ts does not exist yet.

let ctx: TestContext;
let seeded: SeedResult;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp();
  seeded = await seed(ctx.db, ctx.clock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  ctx.close();
});

describe('reminders on the seed day', () => {
  it('sends the fixture’s reminders once, split between the two events', async () => {
    expect(EXPECTED_REMINDERS_DUE).toBe(12);
    const deps = { db: ctx.db, config: ctx.config, send };
    const sent = await run(deps, ctx.clock.now(), ctx.clock.today());
    expect(sent).toHaveLength(EXPECTED_REMINDERS_DUE);

    const sentTasks = await ctx.db
      .select()
      .from(tasks)
      .where(
        inArray(
          tasks.id,
          sent.map((s) => s.taskId),
        ),
      );
    const perEvent = (eventId: number) => sentTasks.filter((t) => t.eventId === eventId).length;
    expect(perEvent(seeded.events.wedding)).toBe(2);
    expect(perEvent(seeded.events.bachelorette)).toBe(10);
    expect(sentTasks.every((t) => t.status === 'accepted')).toBe(true);
    expect(await listOutbox(ctx.db, seeded.organizerId)).toHaveLength(EXPECTED_REMINDERS_DUE);

    expect(await run(deps, ctx.clock.now(), ctx.clock.today())).toEqual([]);
  });
});

// The fixture promises the count on any seed day. These are the same four instants as in
// tests/seed.test.ts (summer, winter and right after each DST change), each on an in-memory
// database, since only the date logic is under test.
describe('reminders on other seed days, and the next one due', () => {
  const testConfig = loadConfig({ TEST_MODE: 'true', DATABASE_URL: 'file::memory:' });

  async function seededInMemory(iso: string) {
    const db = await openDb({ url: ':memory:' });
    await runMigrations(db);
    const clock = fixedClock(iso);
    const result = await seed(db, clock);
    const runOn = (date: string) => run({ db, config: testConfig, send }, `${date}T08:00:00.000Z`, date);
    return { db, clock, result, runOn };
  }

  it.each([
    '2027-07-15T21:30:00.000Z',
    '2027-01-20T06:00:00.000Z',
    '2026-10-26T07:00:00.000Z',
    '2027-03-28T22:30:00.000Z',
  ])('sends EXPECTED_REMINDERS_DUE when seeded at %s', async (iso) => {
    const { db, clock } = await seededInMemory(iso);
    try {
      const deps = { db, config: testConfig, send };
      expect(await run(deps, clock.now(), clock.today())).toHaveLength(EXPECTED_REMINDERS_DUE);
      expect(await run(deps, clock.now(), clock.today())).toEqual([]);
    } finally {
      db.$client.close();
    }
  });

  it('sends Pynte lokalet 6 days after the seed (14 days after Per said yes), and nothing before', async () => {
    const { db, clock, result, runOn } = await seededInMemory('2026-11-01T10:00:00.000Z');
    try {
      const seedDay = clock.today();
      expect(await runOn(seedDay)).toHaveLength(EXPECTED_REMINDERS_DUE);
      expect(await runOn(addDays(seedDay, 5))).toEqual([]);

      const sixDaysLater = await runOn(addDays(seedDay, 6));
      expect(sixDaysLater).toHaveLength(1);
      const [task] = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.id, [sixDaysLater[0]!.taskId]));
      expect(task).toMatchObject({ title: 'Pynte lokalet', eventId: result.events.wedding });

      // Per has no name, so the greeting is just «Hei,».
      const [newest] = await listOutbox(db, result.organizerId);
      expect(newest).toMatchObject({ to: 'per@example.no' });
      expect(newest!.text.startsWith('Hei,\n')).toBe(true);
    } finally {
      db.$client.close();
    }
  });
});
