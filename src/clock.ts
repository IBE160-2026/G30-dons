import { osloDate } from './domain/dates.ts';

// AD-4: the only source of time. now() is a UTC ISO timestamp; today() is the Oslo date (YYYY-MM-DD).
export interface Clock {
  now(): string;
  today(): string;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
  today: () => osloDate(new Date().toISOString()),
};

/** A clock frozen at one instant, for tests. */
export function fixedClock(iso: string): Clock {
  const instant = new Date(iso).toISOString();
  return {
    now: () => instant,
    today: () => osloDate(instant),
  };
}
