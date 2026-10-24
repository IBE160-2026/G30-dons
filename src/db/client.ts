import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

export type Db = LibSQLDatabase<typeof schema> & { $client: Client };

export interface DbOptions {
  url: string;
  authToken?: string | undefined;
}

export async function openDb({ url, authToken }: DbOptions): Promise<Db> {
  if (url.startsWith('file:')) {
    const path = url.startsWith('file://') ? fileURLToPath(url) : url.slice('file:'.length);
    mkdirSync(dirname(path), { recursive: true });
  }
  const client = createClient({ url, authToken });
  // AD-12: foreign keys on for every connection.
  await client.execute('PRAGMA foreign_keys = ON');
  return drizzle(client, { schema }) as Db;
}
