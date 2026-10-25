import { mkdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { register } from '../src/services/auth.ts';
import { createEvent } from '../src/services/events.ts';
import { addHelperToEvent } from '../src/services/helpers.ts';
import { addTask } from '../src/services/tasks.ts';
import { loadTemplates } from '../src/templates/index.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { setupTestApp, type TestContext } from './helpers.ts';

// A BEFORE INSERT trigger with RAISE(IGNORE) makes SQLite skip the row, so `returning()` gives no row.
let ctx: TestContext;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp();
});

afterEach(() => {
  ctx.close();
});

const skipInserts = (table: string) =>
  ctx.db.$client.execute(`CREATE TRIGGER skip_${table} BEFORE INSERT ON ${table} BEGIN SELECT RAISE(IGNORE); END`);

async function organizerWithEvent() {
  const organizer = await register(ctx.db, ctx.clock, {
    name: 'Kari',
    email: 'kari@example.no',
    password: 'hemmelig123',
  });
  const eventId = await createEvent(ctx.db, ctx.clock, loadTemplates(), organizer.id, {
    templateKey: 'bachelorette',
    eventDate: '2027-03-01',
  });
  return { organizerId: organizer.id, eventId };
}

describe('an insert that returns no row', () => {
  it('fails clearly when creating an event', async () => {
    const organizer = await register(ctx.db, ctx.clock, {
      name: 'Kari',
      email: 'kari@example.no',
      password: 'hemmelig123',
    });
    await skipInserts('events');
    await expect(
      createEvent(ctx.db, ctx.clock, loadTemplates(), organizer.id, {
        templateKey: 'bachelorette',
        eventDate: '2027-03-01',
      }),
    ).rejects.toThrow('Insert returned no row');
  });

  it('fails clearly when adding a task', async () => {
    const { organizerId, eventId } = await organizerWithEvent();
    await skipInserts('tasks');
    await expect(
      addTask(ctx.db, ctx.clock, organizerId, eventId, { title: 'Bestille kake', deadline: '2027-02-01' }),
    ).rejects.toThrow('Insert returned no row');
  });

  it('fails clearly when adding a new helper', async () => {
    const { organizerId, eventId } = await organizerWithEvent();
    await skipInserts('helpers');
    await expect(
      addHelperToEvent(ctx.db, ctx.clock, organizerId, eventId, { email: 'ola@example.no', name: 'Ola' }),
    ).rejects.toThrow('Insert returned no row');
  });
});
