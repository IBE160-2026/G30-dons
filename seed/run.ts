import { systemClock } from '../src/clock.ts';
import { runSeedCommand } from './command.ts';

// `npm run seed`: resets the local database file and loads the test data (AD-11). Like the server,
// it reads .env when there is one, and otherwise the environment.
try {
  process.loadEnvFile();
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
}

try {
  process.exitCode = await runSeedCommand(process.env, systemClock);
} catch (err) {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === 'EBUSY' || code === 'EPERM') {
    console.error('Seed avbrutt. Databasefilen er i bruk. Stopp appen (npm run dev) og prøv igjen.');
  } else {
    console.error('Seed feilet:', err);
  }
  process.exitCode = 1;
}
