// AD-4: every date conversion and day difference goes through this module.
// Dates are calendar dates as 'YYYY-MM-DD'; timestamps are UTC ISO strings.

const osloFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Oslo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** The Oslo calendar date of a UTC ISO timestamp. */
export function osloDate(timestamp: string): string {
  return osloFormatter.format(Date.parse(timestamp));
}

export function isDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

function toDayNumber(date: string): number {
  if (!isDate(date)) throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS;
}

/** Whole calendar days from a to b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return toDayNumber(b) - toDayNumber(a);
}

const nbFormatter = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A calendar date in Norwegian, for example "15. januar 2027". */
export function formatDateNb(date: string): string {
  return nbFormatter.format(toDayNumber(date) * DAY_MS);
}

const nbDateTimeFormatter = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Oslo',
});

/** A UTC ISO timestamp as Oslo date and time in Norwegian, for example "1. november 2026 kl. 11:00". */
export function formatDateTimeNb(timestamp: string): string {
  return nbDateTimeFormatter.format(Date.parse(timestamp));
}

export function addDays(date: string, n: number): string {
  return new Date((toDayNumber(date) + n) * DAY_MS).toISOString().slice(0, 10);
}

const osloHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo',
  hour: '2-digit',
  hourCycle: 'h23',
});

/** The Oslo hour (0–23) of a UTC ISO timestamp, summer time included. */
export function osloHour(timestamp: string): number {
  return Number(osloHourFormatter.format(Date.parse(timestamp)));
}

const nbDayFormatter = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** A calendar date as weekday and day in Norwegian, for example "fredag 6. november". */
export function formatDayNb(date: string): string {
  return nbDayFormatter.format(toDayNumber(date) * DAY_MS);
}

/** ISO weekday of a calendar date: 1 for Monday to 7 for Sunday. */
export function isoWeekday(date: string): number {
  // Day 0 (1970-01-01) was a Thursday, ISO weekday 4.
  return ((((toDayNumber(date) + 3) % 7) + 7) % 7) + 1;
}
