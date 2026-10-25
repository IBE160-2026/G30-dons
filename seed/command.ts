import { existsSync, rmSync } from 'node:fs';
import type { Clock } from '../src/clock.ts';
import { ConfigError, loadConfig, type Config } from '../src/config.ts';
import { openDb, sqliteFilePath, type Db } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { absoluteUrl, paths } from '../src/routes/paths.ts';
import { SEED_HELPERS, TEST_LOGIN } from './fixture.ts';
import { seed, type SeedResult } from './seed.ts';

// AD-11: the guarded seed command. It runs only in test mode on a local file: database, and
// resets that file before seeding. Used by `npm run seed` and the Docker start.

export type Log = (line: string) => void;

/** Why seeding is not allowed with this config, or undefined when it is. */
export function seedRefusal(config: Config): string | undefined {
  if (!config.testMode) return 'Seed kjøres bare i testmodus. Sett TEST_MODE=true.';
  if (sqliteFilePath(config.databaseUrl) === undefined) {
    const scheme = config.databaseUrl.split(':')[0];
    return `Seed kjøres bare mot en lokal SQLite-fil (DATABASE_URL=file:...), ikke en ${scheme}://-database.`;
  }
  return undefined;
}

export type StartupSeedDecision = { kind: 'seed' } | { kind: 'keep' } | { kind: 'skip'; reason: string };

/**
 * AD-17: what the container start does before the server. Seed when seeding is allowed and the
 * database file does not exist yet; keep an existing file; otherwise skip, saying why.
 */
export function startupSeedDecision(config: Config, fileExists: (path: string) => boolean): StartupSeedDecision {
  const refusal = seedRefusal(config);
  if (refusal) return { kind: 'skip', reason: refusal };
  return fileExists(sqliteFilePath(config.databaseUrl)!) ? { kind: 'keep' } : { kind: 'seed' };
}

/** Deletes a SQLite file and its journal files, if they exist. */
export function removeDbFiles(path: string): void {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`${path}${suffix}`, { force: true, maxRetries: 10, retryDelay: 100 });
  }
}

/**
 * Resets the database file, migrates and seeds. Assumes seedRefusal(config) is undefined. If seeding
 * fails, the half-built file is deleted, so the next container start seeds again.
 */
export async function resetAndSeed(
  config: Config,
  clock: Clock,
  seedFn: (db: Db, clock: Clock) => Promise<SeedResult> = seed,
): Promise<SeedResult> {
  const path = sqliteFilePath(config.databaseUrl)!;
  if (existsSync(path)) removeDbFiles(path);
  const db = await openDb({ url: config.databaseUrl });
  let seeded = false;
  try {
    await runMigrations(db);
    const result = await seedFn(db, clock);
    seeded = true;
    return result;
  } finally {
    db.$client.close();
    if (!seeded) {
      try {
        removeDbFiles(path);
      } catch (cleanupErr) {
        // Keep the seed error as the one thrown. On Windows the file can stay locked until the
        // process exits; in the container (Linux) deleting an open file always works.
        console.error(`Kunne ikke slette den halvferdige databasen ${path}:`, cleanupErr);
      }
    }
  }
}

/** Prints the test login and the seeded helper links. */
export function printSeedSummary(config: Config, log: Log): void {
  log('Testdata er lagt inn.');
  log(`Logg inn på ${absoluteUrl(config.appBaseUrl, paths.login())}`);
  log(`  E-post: ${TEST_LOGIN.email}`);
  log(`  Passord: ${TEST_LOGIN.password}`);
  log('Hjelperlenker (åpne i et privat vindu):');
  for (const h of SEED_HELPERS) {
    log(`  ${(h.name ?? h.email).padEnd(16)} ${absoluteUrl(config.appBaseUrl, paths.helperPage(h.token))}`);
  }
}

/** The whole `npm run seed`: returns the exit code. Refuses, changing nothing, unless allowed. */
export async function runSeedCommand(
  env: Record<string, string | undefined>,
  clock: Clock,
  log: Log = console.log,
  logError: Log = console.error,
): Promise<number> {
  let config: Config;
  try {
    config = loadConfig(env);
  } catch (err) {
    if (err instanceof ConfigError) {
      // With test mode off, the production checks fail first; the real reason is test mode.
      const reason = env.TEST_MODE?.trim() === 'true' ? err.message : 'Seed kjøres bare i testmodus. Sett TEST_MODE=true.';
      logError(`Seed avbrutt. ${reason}`);
      return 1;
    }
    throw err;
  }
  const refusal = seedRefusal(config);
  if (refusal) {
    logError(`Seed avbrutt. ${refusal}`);
    return 1;
  }
  await resetAndSeed(config, clock);
  printSeedSummary(config, log);
  return 0;
}
