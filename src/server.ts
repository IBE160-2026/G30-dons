import { createApp } from './app.ts';
import { systemClock } from './clock.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';

// Node 22.12+ can load .env itself; it is optional so deployed hosts can use real env vars.
try {
  process.loadEnvFile();
} catch (err) {
  // No .env file: rely on the environment. Any other problem (unreadable, malformed) must stop startup.
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
}

const config = loadConfig(process.env);
const db = await openDb({ url: config.databaseUrl, authToken: config.databaseAuthToken });
await runMigrations(db);

const app = createApp({ config, db, clock: systemClock });
app.listen(config.port, (err?: Error) => {
  if (err) {
    console.error(`Kunne ikke starte på port ${config.port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`MasterPlan kjører på ${config.appBaseUrl} (testmodus: ${config.testMode ? 'på' : 'av'})`);
});
