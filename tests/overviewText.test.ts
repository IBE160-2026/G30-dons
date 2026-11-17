import { describe, expect, it } from 'vitest';
import { osloHour } from '../src/domain/dates.ts';
import { byDay, greeting, overviewSentence, weekGroups } from '../src/domain/overviewText.ts';
import type { TaskStatus } from '../src/domain/taskRules.ts';

// Story 5.1, step 4 (AC 2): the greeting by Oslo time of day, the overview sentence, and the week
// groups «Denne uka» and «Neste uke» (D3). Pure functions; no clock, no database.

describe('osloHour and greeting', () => {
  it.each([
    ['2026-11-10T08:59:00.000Z', 9, 'God morgen'],
    ['2026-11-10T09:00:00.000Z', 10, 'God dag'],
    ['2026-11-10T15:59:00.000Z', 16, 'God dag'],
    ['2026-11-10T16:00:00.000Z', 17, 'God kveld'],
    ['2026-11-10T03:59:00.000Z', 4, 'God kveld'],
    ['2026-11-10T04:00:00.000Z', 5, 'God morgen'],
    ['2026-11-10T22:30:00.000Z', 23, 'God kveld'],
    ['2026-11-10T23:30:00.000Z', 0, 'God kveld'],
    // Summer time: Oslo is UTC+2.
    ['2026-06-10T07:59:00.000Z', 9, 'God morgen'],
    ['2026-06-10T08:00:00.000Z', 10, 'God dag'],
  ])('%s is Oslo hour %i: «%s»', (timestamp, hour, text) => {
    expect(osloHour(timestamp)).toBe(hour);
    expect(greeting(osloHour(timestamp))).toBe(text);
  });

  it('follows the DST change: 00:30Z and 01:30Z on 29 March 2026 are Oslo hour 1 and 3', () => {
    expect(osloHour('2026-03-29T00:30:00.000Z')).toBe(1);
    expect(osloHour('2026-03-29T01:30:00.000Z')).toBe(3);
  });

  it('refuses an hour outside 0–23', () => {
    expect(() => greeting(24)).toThrow(RangeError);
    expect(() => greeting(-1)).toThrow(RangeError);
    expect(() => greeting(9.5)).toThrow(RangeError);
  });
});

describe('overviewSentence', () => {
  it.each([
    [0, 0, 'Ingen arrangementer er i gang.'],
    [1, 0, 'Ett arrangement er i gang. Alt er i rute.'],
    [2, 1, 'To arrangementer er i gang. Ett trenger deg litt nå.'],
    [3, 2, 'Tre arrangementer er i gang. To trenger deg litt nå.'],
    [1, 1, 'Ett arrangement er i gang. Det trenger deg litt nå.'],
    [12, 11, '12 arrangementer er i gang. 11 trenger deg litt nå.'],
  ])('%i in progress, %i needing attention: «%s»', (active, attention, text) => {
    expect(overviewSentence(active, attention)).toBe(text);
  });
});

interface T {
  id: number;
  status: TaskStatus;
  deadline: string;
}

const task = (id: number, deadline: string, status: TaskStatus = 'accepted'): T => ({ id, status, deadline });
const ids = (list: readonly T[]) => list.map((t) => t.id);

describe('weekGroups (D3)', () => {
  it('splits the rest of this Monday–Sunday week from the next one, on a Tuesday', () => {
    // Tuesday 10 November 2026.
    const tasks = [
      task(1, '2026-11-10'),
      task(2, '2026-11-15'),
      task(3, '2026-11-16'),
      task(4, '2026-11-22'),
      task(5, '2026-11-23'),
    ];
    const groups = weekGroups(tasks, '2026-11-10', new Set());
    expect(ids(groups.thisWeek)).toEqual([1, 2]);
    expect(ids(groups.nextWeek)).toEqual([3, 4]);
  });

  it('on a Sunday, «Denne uka» is only today and «Neste uke» is Monday to Sunday', () => {
    const tasks = [
      task(1, '2026-11-14'),
      task(2, '2026-11-15'),
      task(3, '2026-11-16'),
      task(4, '2026-11-22'),
      task(5, '2026-11-23'),
    ];
    const groups = weekGroups(tasks, '2026-11-15', new Set());
    expect(ids(groups.thisWeek)).toEqual([2]);
    expect(ids(groups.nextWeek)).toEqual([3, 4]);
  });

  it('on a Monday, «Denne uka» runs to Sunday', () => {
    const groups = weekGroups(
      [task(1, '2026-11-16'), task(2, '2026-11-22'), task(3, '2026-11-23')],
      '2026-11-16',
      new Set(),
    );
    expect(ids(groups.thisWeek)).toEqual([1, 2]);
    expect(ids(groups.nextWeek)).toEqual([3]);
  });

  it('leaves out Done tasks, past deadlines and tasks already in «Trenger deg nå»', () => {
    const tasks = [
      task(1, '2026-11-11', 'done'),
      task(2, '2026-11-09'),
      task(3, '2026-11-12', 'unassigned'),
      task(4, '2026-11-12', 'open'),
      task(5, '2026-11-18', 'declined'),
      task(6, '2026-11-18', 'open'),
    ];
    const groups = weekGroups(tasks, '2026-11-10', new Set([3, 5]));
    expect(ids(groups.thisWeek)).toEqual([4]);
    expect(ids(groups.nextWeek)).toEqual([6]);
  });

  it('sorts each group by deadline and keeps the input order for equal deadlines', () => {
    const tasks = [task(1, '2026-11-14'), task(2, '2026-11-11'), task(3, '2026-11-14'), task(4, '2026-11-11')];
    expect(ids(weekGroups(tasks, '2026-11-10', new Set()).thisWeek)).toEqual([2, 4, 1, 3]);
  });

  it('crosses a month and a year boundary', () => {
    // Wednesday 30 December 2026: this week ends Sunday 3 January 2027.
    const tasks = [task(1, '2027-01-03'), task(2, '2027-01-04'), task(3, '2027-01-10'), task(4, '2027-01-11')];
    const groups = weekGroups(tasks, '2026-12-30', new Set());
    expect(ids(groups.thisWeek)).toEqual([1]);
    expect(ids(groups.nextWeek)).toEqual([2, 3]);
  });

  it('gives two empty groups when nothing is due', () => {
    expect(weekGroups([], '2026-11-10', new Set())).toEqual({ thisWeek: [], nextWeek: [] });
  });
});

describe('byDay', () => {
  it('groups tasks that are already sorted by deadline into one entry per day', () => {
    const days = byDay([task(1, '2026-11-11'), task(2, '2026-11-11'), task(3, '2026-11-13')]);
    expect(days.map((d) => [d.date, ids(d.tasks)])).toEqual([
      ['2026-11-11', [1, 2]],
      ['2026-11-13', [3]],
    ]);
  });
});
