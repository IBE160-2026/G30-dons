import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { eq, isNotNull, isNull } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EXPECTED_COUNTS, SEED_EVENT_NAMES, SEED_HELPERS, TEST_LOGIN, type SeedEventKey } from '../seed/fixture.ts';
import { resetAndSeed, runSeedCommand, startupSeedDecision } from '../seed/command.ts';
import { loadConfig } from '../src/config.ts';
import { seed, type SeedResult } from '../seed/seed.ts';
import { fixedClock, systemClock } from '../src/clock.ts';
import { openDb, type Db } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { eventHelpers, helpers, messages, tasks, TASK_STATUSES, type TaskStatus } from '../src/db/schema.ts';
import { addDays, daysBetween, osloDate } from '../src/domain/dates.ts';
import { assertFieldInvariant } from '../src/domain/taskRules.ts';
import { TOKEN_FORMAT } from '../src/services/helpers.ts';
import { loadEventSummary, overviewSummaries } from '../src/services/summaries.ts';
import { listForEvent } from '../src/services/tasks.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { setupTestApp, type TestContext } from './helpers.ts';

// FR-25, AD-11 (story 1.6): the seed builds the fixture through the services, and the counts the
// app shows equal EXPECTED_COUNTS on any seed day. The fixed test clock makes today 2026-11-01.
let ctx: TestContext;
let seeded: SeedResult;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp();
  seeded = await seed(ctx.db, ctx.clock);
});

afterEach(() => {
  ctx.close();
});

const EVENT_KEYS: SeedEventKey[] = ['wedding', 'bachelorette'];

/** Every count the fixture promises, read through the services, for one event. */
async function actualCounts(db: Db, result: SeedResult, key: SeedEventKey, today: string) {
  const eventId = result.events[key];
  const eventTasks = await listForEvent(db, result.organizerId, eventId);
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
  for (const t of eventTasks) byStatus[t.status] += 1;
  const { summary, newReplies } = await loadEventSummary(db, result.organizerId, eventId, today);
  return {
    byStatus,
    total: summary.total,
    urgent: summary.urgent.length,
    needsHelper: summary.needsHelper.length,
    done: summary.done,
    newReplies,
  };
}

const testDbUrl = () => pathToFileURL(join(TEST_DB_DIR, `${randomUUID()}.db`)).href;

describe('seed counts', () => {
  it('matches EXPECTED_COUNTS through the event summary and the overview', async () => {
    const today = ctx.clock.today();
    for (const key of EVENT_KEYS) {
      expect(await actualCounts(ctx.db, seeded, key, today)).toEqual(EXPECTED_COUNTS[key]);
    }
    const overview = await overviewSummaries(ctx.db, seeded.organizerId, today);
    expect(overview.map((r) => r.event.name)).toEqual([SEED_EVENT_NAMES.wedding, SEED_EVENT_NAMES.bachelorette]);
    for (const row of overview) {
      const key = row.event.id === seeded.events.wedding ? 'wedding' : 'bachelorette';
      expect(row.summary.urgent.length).toBe(EXPECTED_COUNTS[key].urgent);
      expect(row.summary.needsHelper.length).toBe(EXPECTED_COUNTS[key].needsHelper);
      expect(row.newReplies).toBe(EXPECTED_COUNTS[key].newReplies);
    }
    expect(overview[1]!.summary.onTrack).toBe(true);
    expect(overview[0]!.summary.onTrack).toBe(false);
  });

  it('every byStatus row adds up to the total', () => {
    for (const key of EVENT_KEYS) {
      const c = EXPECTED_COUNTS[key];
      expect(Object.values(c.byStatus).reduce((a, b) => a + b, 0)).toBe(c.total);
      expect(c.byStatus.done).toBe(c.done);
    }
  });

  it('shows Bachelorette "I rute" and the Wedding with "haster" on the overview, and the counts in the event view', async () => {
    const kari = request.agent(ctx.app);
    const login = await kari.post('/logg-inn').type('form').send({ email: TEST_LOGIN.email, password: TEST_LOGIN.password });
    expect(login.status).toBe(302);

    const res = await kari.get('/');
    expect(res.status).toBe(200);
    const row = (eventId: number) => {
      const start = res.text.indexOf(`href="/events/${eventId}"`);
      expect(start).toBeGreaterThan(-1);
      return res.text.slice(start, res.text.indexOf('</li>', start));
    };
    const w = EXPECTED_COUNTS.wedding;
    expect(row(seeded.events.bachelorette)).toContain('I rute');
    expect(row(seeded.events.wedding)).toContain(`${w.urgent} haster · ${w.needsHelper} trenger hjelper`);
    expect(row(seeded.events.wedding)).toContain(`${w.newReplies} nye svar`);
    expect(row(seeded.events.bachelorette)).toContain('1 nytt svar');

    for (const key of EVENT_KEYS) {
      const c = EXPECTED_COUNTS[key];
      const view = await kari.get(`/events/${seeded.events[key]}`);
      expect(view.status).toBe(200);
      expect(view.text).toContain(`${c.done} av ${c.total} ferdig`);
      expect(view.text).toContain(c.urgent + c.needsHelper === 0 ? 'Ingenting haster' : `${c.urgent} haster · ${c.needsHelper} trenger hjelper`);
    }
  });

  // 2026-10-26 and 2027-03-29 are the days right after the Oslo DST changes, so the seed's past
  // steps (up to 60 days back) cross a change; 2027-03-28T22:30Z is 00:30 Oslo time on the 29th.
  it('gives the same counts on summer and winter seed days and right after each DST change', async () => {
    for (const iso of [
      '2027-07-15T21:30:00.000Z',
      '2027-01-20T06:00:00.000Z',
      '2026-10-26T07:00:00.000Z',
      '2027-03-28T22:30:00.000Z',
    ]) {
      const db = await openDb({ url: testDbUrl() });
      try {
        await runMigrations(db);
        const clock = fixedClock(iso);
        const result = await seed(db, clock);
        for (const key of EVENT_KEYS) {
          expect(await actualCounts(db, result, key, clock.today()), `${key} seeded at ${iso}`).toEqual(EXPECTED_COUNTS[key]);
        }
      } finally {
        db.$client.close();
      }
    }
  });
});

describe('seeded rows', () => {
  it('every seeded task passes assertFieldInvariant', async () => {
    const rows = await ctx.db.select().from(tasks);
    expect(rows.length).toBe(EXPECTED_COUNTS.wedding.total + EXPECTED_COUNTS.bachelorette.total);
    for (const t of rows) expect(() => assertFieldInvariant(t)).not.toThrow();
  });

  it('hits the fixture targets: stale Open, changed task, New and seen replies, shared helpers, one nameless helper', async () => {
    const today = ctx.clock.today();
    const wedding = await listForEvent(ctx.db, seeded.organizerId, seeded.events.wedding);
    const stale = wedding.filter((t) => t.status === 'open' && t.assignedAt && daysBetween(osloDate(t.assignedAt), today) >= 7);
    expect(stale.length).toBeGreaterThanOrEqual(1);
    expect(wedding.some((t) => t.changedSinceAnswer && t.status === 'accepted')).toBe(true);
    for (const s of TASK_STATUSES) expect(wedding.some((t) => t.status === s), s).toBe(true);

    expect((await ctx.db.select().from(messages).where(isNull(messages.seenAt))).length).toBeGreaterThan(0);
    expect((await ctx.db.select().from(messages).where(isNotNull(messages.seenAt))).length).toBeGreaterThan(0);

    for (const key of ['ola', 'kim', 'siri'] as const) {
      const links = await ctx.db.select().from(eventHelpers).where(eq(eventHelpers.helperId, seeded.helpers[key].id));
      expect(links.map((l) => l.eventId).sort()).toEqual([seeded.events.wedding, seeded.events.bachelorette].sort());
    }
    const [per] = await ctx.db.select().from(helpers).where(eq(helpers.email, 'per@example.no'));
    expect(per!.name).toBeNull();
    expect((await ctx.db.select().from(helpers)).length).toBe(SEED_HELPERS.length);
  });

  it('dates everything relative to the seed day, in the past', async () => {
    const today = ctx.clock.today();
    const overview = await overviewSummaries(ctx.db, seeded.organizerId, today);
    expect(overview.map((r) => r.event.eventDate)).toEqual([addDays(today, 21), addDays(today, 45)]);
    for (const m of await ctx.db.select().from(messages)) expect(m.createdAt < ctx.clock.now()).toBe(true);
  });

  it('uses fixed 32-character tokens', () => {
    for (const h of SEED_HELPERS) expect(h.token).toMatch(TOKEN_FORMAT);
    expect(new Set(SEED_HELPERS.map((h) => h.token)).size).toBe(SEED_HELPERS.length);
    for (const h of SEED_HELPERS) expect(seeded.helpers[h.key].token).toBe(h.token);
  });
});

describe('assertFieldInvariant', () => {
  const base = { helperId: 1, assignedAt: '2026-10-01T10:00:00.000Z', acceptedAt: null };
  it('accepts valid rows, including a Done task that keeps its helper', () => {
    expect(() => assertFieldInvariant({ status: 'unassigned', helperId: null, assignedAt: null, acceptedAt: null })).not.toThrow();
    expect(() => assertFieldInvariant({ ...base, status: 'open' })).not.toThrow();
    expect(() => assertFieldInvariant({ ...base, status: 'accepted', acceptedAt: '2026-10-02T10:00:00.000Z' })).not.toThrow();
    expect(() => assertFieldInvariant({ ...base, status: 'done' })).not.toThrow();
  });
  it('refuses impossible rows', () => {
    expect(() => assertFieldInvariant({ ...base, status: 'accepted' })).toThrow(/accepted_at/);
    expect(() => assertFieldInvariant({ ...base, status: 'declined', helperId: null })).toThrow(/helper_id/);
    expect(() => assertFieldInvariant({ ...base, status: 'cant_do', assignedAt: null })).toThrow(/assigned_at/);
    expect(() => assertFieldInvariant({ ...base, status: 'unassigned' })).toThrow(/Unassigned/);
  });
  it('refuses accepted_at on Unassigned, Open and Declined tasks, and allows it on Done and Can’t be done', () => {
    const acceptedAt = '2026-10-02T10:00:00.000Z';
    expect(() => assertFieldInvariant({ status: 'unassigned', helperId: null, assignedAt: null, acceptedAt })).toThrow(/accepted_at/);
    expect(() => assertFieldInvariant({ ...base, status: 'open', acceptedAt })).toThrow(/accepted_at/);
    expect(() => assertFieldInvariant({ ...base, status: 'declined', acceptedAt })).toThrow(/accepted_at/);
    expect(() => assertFieldInvariant({ ...base, status: 'done', acceptedAt })).not.toThrow();
    expect(() => assertFieldInvariant({ ...base, status: 'cant_do', acceptedAt })).not.toThrow();
  });
});

describe('seeded helper links', () => {
  it('opens each helper page with his own tasks', async () => {
    for (const h of SEED_HELPERS) {
      const res = await request(ctx.app).get(`/h/${h.token}`);
      expect(res.status, h.key).toBe(200);
      expect(res.text).toContain('Kari har invitert deg');
      const own = await ctx.db.select().from(tasks).where(eq(tasks.helperId, seeded.helpers[h.key].id));
      expect(own.length).toBeGreaterThan(0);
      for (const t of own) expect(res.text).toContain(t.title);
    }
    const per = await request(ctx.app).get(`/h/${SEED_HELPERS.find((h) => h.key === 'per')!.token}`);
    expect(per.text).toContain('Pynte lokalet');
    expect(per.text).not.toContain(SEED_EVENT_NAMES.bachelorette);
  });
});

const quiet = () => {
  const lines: string[] = [];
  return { lines, log: (l: string) => lines.push(l) };
};

describe('npm run seed (guarded command)', () => {

  // Two real `npm run seed` processes, like the examiner runs it. In-process, Windows keeps the
  // SQLite file locked after close until the connection is collected, so the reset could not delete it.
  // The children seed with the real date, so the counts are read with it too. If the Oslo day
  // changes during the check (a run across midnight), it is run once more, all on the new day.
  it('resets the file and seeds the same data again, with the same links', async () => {
    const dayBefore = systemClock.today();
    try {
      await reseedCheck();
    } catch (err) {
      if (systemClock.today() === dayBefore) throw err;
      await reseedCheck();
    }
  }, 120_000);

  async function reseedCheck() {
    const path = join(TEST_DB_DIR, `${randomUUID()}.db`);
    const runSeed = () =>
      spawnSync(process.execPath, ['--import', 'tsx', 'seed/run.ts'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: { ...process.env, TEST_MODE: 'true', DATABASE_URL: pathToFileURL(path).href, PORT: '3000', APP_BASE_URL: '' },
        encoding: 'utf8',
      });
    const counts = async (file: string) => {
      const db = await openDb({ url: pathToFileURL(file).href });
      try {
        const [kari] = await db.select({ id: helpers.organizerId }).from(helpers).limit(1);
        const tokens = (await db.select({ t: helpers.linkToken }).from(helpers)).map((r) => r.t).sort();
        const overview = await overviewSummaries(db, kari!.id, systemClock.today());
        return {
          tokens,
          rows: overview.map((r) => [r.event.name, r.summary.total, r.summary.done, r.summary.urgent.length, r.summary.needsHelper.length, r.newReplies]),
        };
      } finally {
        db.$client.close();
      }
    };

    const first = runSeed();
    expect(first.status, first.stderr).toBe(0);
    // Read a copy, so this process holds no lock on the file the second run deletes.
    copyFileSync(path, `${path}.first`);
    const second = runSeed();
    expect(second.status, second.stderr).toBe(0);
    const once = await counts(`${path}.first`);
    expect(await counts(path)).toEqual(once);
    expect(once.tokens).toEqual(SEED_HELPERS.map((h) => h.token).sort());
    expect(once.rows).toEqual([
      [SEED_EVENT_NAMES.wedding, 23, 15, 2, 4, 2],
      [SEED_EVENT_NAMES.bachelorette, 16, 6, 0, 0, 1],
    ]);
    expect(second.stdout).toContain(TEST_LOGIN.email);
    expect(second.stdout).toContain(TEST_LOGIN.password);
    for (const h of SEED_HELPERS) expect(second.stdout).toContain(`http://localhost:3000/h/${h.token}`);
    expect(second.stdout).toBe(first.stdout);
  }

  it('refuses with test mode off and leaves the database file untouched', async () => {
    const path = join(TEST_DB_DIR, `${randomUUID()}.db`);
    writeFileSync(path, 'not a database, must survive');
    const before = statSync(path).mtimeMs;
    const out = quiet();
    const code = await runSeedCommand(
      {
        TEST_MODE: 'false',
        DATABASE_URL: pathToFileURL(path).href,
        SESSION_SECRET: 'a-production-secret-that-is-long-enough-123',
        APP_BASE_URL: 'https://masterplan.example',
        MAIL_TRANSPORT: 'disabled',
      },
      fixedClock('2026-11-01T10:00:00.000Z'),
      out.log,
      out.log,
    );
    expect(code).toBe(1);
    expect(out.lines.join('\n')).toMatch(/TEST_MODE=true/);
    expect(readFileSync(path, 'utf8')).toBe('not a database, must survive');
    expect(statSync(path).mtimeMs).toBe(before);
  });

  it('refuses a libsql:// database and an invalid config, touching nothing', async () => {
    const out = quiet();
    const clock = fixedClock('2026-11-01T10:00:00.000Z');
    expect(
      await runSeedCommand({ TEST_MODE: 'true', DATABASE_URL: 'libsql://example.turso.io', DATABASE_AUTH_TOKEN: 'x' }, clock, out.log, out.log),
    ).toBe(1);
    expect(out.lines.join('\n')).toMatch(/lokal SQLite-fil/);
    expect(out.lines.join('\n')).toContain('ikke en libsql://-database.');
    expect(await runSeedCommand({ TEST_MODE: 'true', DATABASE_URL: 'libsql://example.turso.io' }, clock, out.log, out.log)).toBe(1);
    expect(out.lines.at(-1)).toMatch(/^Seed avbrutt\..*DATABASE_AUTH_TOKEN mangler/);
  });

  it('deletes the half-built database file when seeding fails, so the next start seeds again', async () => {
    const path = join(TEST_DB_DIR, `${randomUUID()}.db`);
    const config = loadConfig({ TEST_MODE: 'true', DATABASE_URL: pathToFileURL(path).href });
    const failing = async () => {
      throw new Error('seed step failed');
    };
    await expect(resetAndSeed(config, fixedClock('2026-11-01T10:00:00.000Z'), failing)).rejects.toThrow('seed step failed');
    // On Windows libsql's transaction connections keep the file locked until they are collected,
    // so the delete can only be checked elsewhere (the container is Linux).
    if (process.platform === 'win32') return;
    expect(existsSync(path)).toBe(false);
    expect(startupSeedDecision(config, existsSync)).toEqual({ kind: 'seed' });
  }, 20_000);
});

describe('startupSeedDecision (container start)', () => {
  const fileUrl = 'file:./data/local.db';
  const yes = () => true;
  const no = () => false;

  it('seeds in test mode when the database file is missing, and keeps an existing file', () => {
    const config = loadConfig({ TEST_MODE: 'true', DATABASE_URL: fileUrl });
    expect(startupSeedDecision(config, no)).toEqual({ kind: 'seed' });
    expect(startupSeedDecision(config, yes)).toEqual({ kind: 'keep' });
  });

  it('skips with test mode off, whether or not the file exists', () => {
    const config = loadConfig({
      TEST_MODE: 'false',
      DATABASE_URL: fileUrl,
      SESSION_SECRET: 'a-production-secret-that-is-long-enough-123',
      APP_BASE_URL: 'https://masterplan.example',
      MAIL_TRANSPORT: 'disabled',
    });
    for (const exists of [yes, no]) {
      const decision = startupSeedDecision(config, exists);
      expect(decision.kind).toBe('skip');
      expect(decision.kind === 'skip' && decision.reason).toMatch(/TEST_MODE=true/);
    }
  });

  it('skips a libsql:// database in test mode, saying why', () => {
    const config = loadConfig({ TEST_MODE: 'true', DATABASE_URL: 'libsql://example.turso.io', DATABASE_AUTH_TOKEN: 'x' });
    expect(startupSeedDecision(config, no)).toEqual({
      kind: 'skip',
      reason: 'Seed kjøres bare mot en lokal SQLite-fil (DATABASE_URL=file:...), ikke en libsql://-database.',
    });
  });

  it('does not create a database file when it refuses', async () => {
    const path = join(TEST_DB_DIR, `${randomUUID()}.db`);
    const out = quiet();
    expect(await runSeedCommand({ TEST_MODE: 'false', DATABASE_URL: pathToFileURL(path).href }, fixedClock('2026-11-01T10:00:00.000Z'), out.log, out.log)).toBe(1);
    expect(out.lines.at(-1)).toMatch(/TEST_MODE=true/);
    expect(existsSync(path)).toBe(false);
  });
});

describe('docs/fixtures.md', () => {
  it('shows the EXPECTED_COUNTS numbers for both events', () => {
    const doc = readFileSync(new URL('../docs/fixtures.md', import.meta.url), 'utf8').replace(/[ \t]+/g, ' ');
    for (const key of EVENT_KEYS) {
      const c = EXPECTED_COUNTS[key];
      const cells = [
        c.total,
        ...TASK_STATUSES.map((s) => c.byStatus[s]),
        c.urgent,
        c.needsHelper,
        c.done,
        c.newReplies,
      ];
      expect(doc, key).toContain(`| ${SEED_EVENT_NAMES[key]} | ${cells.join(' | ')} |`);
    }
  });
});
