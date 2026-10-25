import { randomBytes, type ScryptOptions, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Clock } from '../clock.ts';
import type { Db } from '../db/client.ts';
import { organizers } from '../db/schema.ts';
import { DomainError } from '../domain/errors.ts';

// FR-1, AD-5: organizer accounts. Passwords are stored only as salted scrypt hashes.

export interface OrganizerSummary {
  id: number;
  name: string;
  email: string;
}

const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Compared against when the email is unknown, so both failure paths take the same time.
const dummyHash = hashPassword(randomBytes(16).toString('hex'));

export async function register(
  db: Db,
  clock: Clock,
  input: { name: string; email: string; password: string },
): Promise<OrganizerSummary> {
  const email = normalizeEmail(input.email);
  const existing = await db.select({ id: organizers.id }).from(organizers).where(eq(organizers.email, email));
  if (existing.length > 0) throw new DomainError('email_in_use');

  const passwordHash = await hashPassword(input.password);
  try {
    const [row] = await db
      .insert(organizers)
      .values({ name: input.name.trim(), email, passwordHash, createdAt: clock.now() })
      .returning({ id: organizers.id, name: organizers.name, email: organizers.email });
    if (!row) throw new Error('Insert returned no row');
    return row;
  } catch (err) {
    // A concurrent registration with the same email hits the unique index.
    if (err instanceof Error && /UNIQUE constraint failed/i.test(`${err.message} ${String(err.cause ?? '')}`)) {
      throw new DomainError('email_in_use');
    }
    throw err;
  }
}

/** Returns the organizer, or throws invalid_credentials for a wrong password and an unknown email alike. */
export async function authenticate(db: Db, input: { email: string; password: string }): Promise<OrganizerSummary> {
  const [row] = await db
    .select()
    .from(organizers)
    .where(eq(organizers.email, normalizeEmail(input.email)));
  const ok = await verifyPassword(input.password, row?.passwordHash ?? (await dummyHash));
  if (!row || !ok) throw new DomainError('invalid_credentials');
  return { id: row.id, name: row.name, email: row.email };
}

export async function getOrganizer(db: Db, organizerId: number): Promise<OrganizerSummary | undefined> {
  const [row] = await db
    .select({ id: organizers.id, name: organizers.name, email: organizers.email })
    .from(organizers)
    .where(eq(organizers.id, organizerId));
  return row;
}
