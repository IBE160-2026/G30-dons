import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const TEST_DB_DIR = join(tmpdir(), 'masterplan-tests');
