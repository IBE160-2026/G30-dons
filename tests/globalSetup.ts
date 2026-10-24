import { rmSync } from 'node:fs';
import { TEST_DB_DIR } from './dbDir.ts';

// Clears the previous run's test databases once. Files are not deleted per test, because
// Windows keeps a SQLite file locked for a while after the connection closes.
export default function setup(): void {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // A locked leftover from an earlier run is harmless: each test uses a new file name.
  }
}
