import type { TaskStatus } from '../src/domain/taskRules.ts';

// AD-11: the one fixture shared by the seed, the tests and docs/fixtures.md. The tokens are fixed
// so the helper links in the README keep working after a re-seed. Test data only.

export const TEST_LOGIN = {
  name: 'Kari',
  email: 'kari@example.no',
  password: 'hemmelig123',
} as const;

export type SeedHelperKey = 'ola' | 'kim' | 'siri' | 'per';

export interface SeedHelper {
  key: SeedHelperKey;
  /** null: shown by email in the app. */
  name: string | null;
  email: string;
  /** 32 characters, matching TOKEN_FORMAT. */
  token: string;
}

export const SEED_HELPERS: readonly SeedHelper[] = [
  { key: 'ola', name: 'Ola', email: 'ola@example.no', token: 'ola-testlenke-masterplan-seed-01' },
  { key: 'kim', name: 'Kim', email: 'kim@example.no', token: 'kim-testlenke-masterplan-seed-02' },
  { key: 'siri', name: 'Siri', email: 'siri@example.no', token: 'siri-testlenke-masterplan-seed03' },
  { key: 'per', name: null, email: 'per@example.no', token: 'per-testlenke-masterplan-seed-04' },
];

export type SeedEventKey = 'wedding' | 'bachelorette';

export interface ExpectedCounts {
  /** Tasks per status; they add up to the event's total. */
  byStatus: Record<TaskStatus, number>;
  total: number;
  urgent: number;
  needsHelper: number;
  done: number;
  newReplies: number;
}

/** What the overview and event view show straight after seeding, on any seed day. */
export const EXPECTED_COUNTS: Record<SeedEventKey, ExpectedCounts> = {
  wedding: {
    byStatus: { unassigned: 1, open: 2, accepted: 3, declined: 1, done: 15, cant_do: 1 },
    total: 23,
    urgent: 2,
    needsHelper: 4,
    done: 15,
    newReplies: 2,
  },
  bachelorette: {
    byStatus: { unassigned: 0, open: 0, accepted: 10, declined: 0, done: 6, cant_do: 0 },
    total: 16,
    urgent: 0,
    needsHelper: 0,
    done: 6,
    newReplies: 1,
  },
};

/** Event names as the seed creates them. */
export const SEED_EVENT_NAMES: Record<SeedEventKey, string> = {
  wedding: 'Bryllupet til Kari og Jon',
  bachelorette: 'Utdrikningslag for Lise',
};
