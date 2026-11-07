import { mkdirSync } from 'node:fs';
import { inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPECTED_REMINDERS_DUE } from '../seed/fixture.ts';
import { type SeedResult, seed } from '../seed/seed.ts';
import { tasks } from '../src/db/schema.ts';
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
