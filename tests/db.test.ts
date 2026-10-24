import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { absoluteUrl, paths } from '../src/routes/paths.ts';
import { TEST_DB_DIR } from './dbDir.ts';

describe('openDb', () => {
  it('creates missing folders for a bare relative file: path, like the .env.example default', async () => {
    const file = join(TEST_DB_DIR, randomUUID(), 'sub', 'local.db');
    const url = `file:${relative(process.cwd(), file).replaceAll('\\', '/')}`;
    const db = await openDb({ url });
    try {
      await runMigrations(db);
      expect(existsSync(file)).toBe(true);
    } finally {
      db.$client.close();
    }
  });
});

describe('absoluteUrl', () => {
  it('joins the base URL and a path with exactly one slash', () => {
    expect(absoluteUrl('https://masterplan.example/', paths.login())).toBe('https://masterplan.example/logg-inn');
    expect(absoluteUrl('http://localhost:3000', 'h/abc')).toBe('http://localhost:3000/h/abc');
  });
});
