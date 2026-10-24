import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Express } from 'express';
import { createApp } from '../src/app.ts';
import { fixedClock, type Clock } from '../src/clock.ts';
import { loadConfig, type Config } from '../src/config.ts';
import { openDb, type Db } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { TEST_DB_DIR } from './dbDir.ts';

// FR-27: tests use an explicit test environment (never .env), their own database file and a fixed clock.
export const FIXED_NOW = '2026-11-01T10:00:00.000Z';

export interface TestContext {
  app: Express;
  db: Db;
  clock: Clock;
  config: Config;
  close: () => void;
}

export async function setupTestApp(env: Record<string, string> = {}): Promise<TestContext> {
  const config = loadConfig({
    TEST_MODE: 'true',
    DATABASE_URL: pathToFileURL(join(TEST_DB_DIR, `${randomUUID()}.db`)).href,
    SESSION_SECRET: 'test-secret',
    ...env,
  });
  const db = await openDb({ url: config.databaseUrl });
  await runMigrations(db);
  const clock = fixedClock(FIXED_NOW);
  const app = createApp({ config, db, clock });
  return { app, db, clock, config, close: () => db.$client.close() };
}
