import { describe, expect, it } from 'vitest';
import { fixedClock } from '../src/clock.ts';
import { addDays, daysBetween, isDate, osloDate } from '../src/domain/dates.ts';

describe('osloDate', () => {
  it('rolls over at Oslo midnight, not UTC midnight (winter, UTC+1)', () => {
    expect(osloDate('2026-11-01T22:59:59Z')).toBe('2026-11-01');
    expect(osloDate('2026-11-01T23:00:00Z')).toBe('2026-11-02');
  });

  it('rolls over at Oslo midnight in summer (UTC+2)', () => {
    expect(osloDate('2026-06-30T21:59:59Z')).toBe('2026-06-30');
    expect(osloDate('2026-06-30T22:00:00Z')).toBe('2026-07-01');
  });
});

describe('daysBetween and addDays', () => {
  it('counts calendar days across the DST change', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
    expect(addDays('2026-10-24', 14)).toBe('2026-11-07');
    expect(addDays('2026-03-01', -3)).toBe('2026-02-26');
  });

  it('rejects malformed dates', () => {
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('2026-2-3')).toBe(false);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
  });
});

describe('fixedClock', () => {
  it('returns the same instant and its Oslo date', () => {
    const clock = fixedClock('2026-11-01T23:30:00Z');
    expect(clock.now()).toBe('2026-11-01T23:30:00.000Z');
    expect(clock.today()).toBe('2026-11-02');
  });
});
