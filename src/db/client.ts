import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

export type Db = LibSQLDatabase<typeof schema> & { $client: Client };
/** A transaction handle; services that may run inside a caller's transaction accept this. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface DbOptions {
  url: string;
  authToken?: string | undefined;
}

/** The local file path of a `file:` database URL, or undefined for any other URL. */
export function sqliteFilePath(url: string): string | undefined {
  if (!url.startsWith('file:')) return undefined;
  return url.startsWith('file://') ? fileURLToPath(url) : url.slice('file:'.length);
}

export async function openDb({ url, authToken }: DbOptions): Promise<Db> {
  const path = sqliteFilePath(url);
  if (path !== undefined) mkdirSync(dirname(path), { recursive: true });
  const client = createClient({ url, authToken });
  // AD-12: foreign keys on for every connection.
  await client.execute('PRAGMA foreign_keys = ON');
  return drizzle(client, { schema }) as Db;
}
