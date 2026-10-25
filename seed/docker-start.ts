import { existsSync } from 'node:fs';
import { systemClock } from '../src/clock.ts';
import { loadConfig } from '../src/config.ts';
import { sqliteFilePath } from '../src/db/client.ts';
import { printSeedSummary, removeDbFiles, resetAndSeed, startupSeedDecision } from './command.ts';

// AD-17: the container's start command. In test mode, when the database file does not exist yet,
// it seeds first (the AD-11 guard still applies); then it starts the server in this same process.
// A restart finds the file and keeps the data.

/** Set while the first-start seed runs, so a stop mid-seed leaves no half-built file. */
let seedingPath: string | undefined;

// As PID 1 in a container, Node has no default handler for these, so `docker stop` would wait.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (seedingPath !== undefined) {
      try {
        removeDbFiles(seedingPath);
      } catch (err) {
        console.error('Kunne ikke slette den halvferdige databasen:', err);
      }
    }
    process.exit(0);
  });
}

try {
  process.loadEnvFile();
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
}

const config = loadConfig(process.env);
const decision = startupSeedDecision(config, existsSync);
if (decision.kind === 'skip') {
  console.log(`Hopper over testdata: ${decision.reason}`);
} else if (decision.kind === 'seed') {
  seedingPath = sqliteFilePath(config.databaseUrl);
  await resetAndSeed(config, systemClock);
  seedingPath = undefined;
  printSeedSummary(config, console.log);
}

await import('../src/server.ts');
