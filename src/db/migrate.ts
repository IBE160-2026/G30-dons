import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import type { Db } from './client.ts';

// AD-14: applies committed migrations. Called by server start, seed and test setup.
const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url));

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}
