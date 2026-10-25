import { describe, expect, it } from 'vitest';
import { formatDateTimeNb } from '../src/domain/dates.ts';
import { eventSummary, needsHelper, urgent, type StatusTask } from '../src/domain/status.ts';
import type { TaskStatus } from '../src/domain/taskRules.ts';

// AD-3, FR-21 (story 1.5): the derived-state rules as pure functions with a fixed today.
const TODAY = '2026-11-01';
const FAR = '2027-03-01';
const EVENT = { eventDate: '2027-05-01' };

const task = (status: TaskStatus, deadline = FAR, assignedAt: string | null = null): StatusTask => ({
  status,
  deadline,
  assignedAt: assignedAt ?? (status === 'unassigned' ? null : '2026-10-31T10:00:00.000Z'),
});

describe('needsHelper and urgent', () => {
  it('Open assigned 6 days ago is fine; 7 days ago needs a helper', () => {
    expect(needsHelper(task('open', FAR, '2026-10-26T10:00:00.000Z'), TODAY)).toBe(false);
    expect(needsHelper(task('open', FAR, '2026-10-25T10:00:00.000Z'), TODAY)).toBe(true);
  });

  it('uses the Oslo calendar day of assigned_at', () => {
    // 22:30Z on 25 Oct is 23:30 in Oslo (CET after the DST change), still 25 Oct: 7 days.
    expect(needsHelper(task('open', FAR, '2026-10-25T22:30:00.000Z'), TODAY)).toBe(true);
    // 23:30Z is 00:30 on 26 Oct in Oslo: 6 days.
    expect(needsHelper(task('open', FAR, '2026-10-25T23:30:00.000Z'), TODAY)).toBe(false);
  });

  it('4 days left is neither; 3 days left makes Open need a helper and Accepted urgent', () => {
    for (const status of ['open', 'accepted'] as const) {
      expect(needsHelper(task(status, '2026-11-05'), TODAY)).toBe(false);
      expect(urgent(task(status, '2026-11-05'), TODAY)).toBe(false);
    }
    expect(needsHelper(task('open', '2026-11-04'), TODAY)).toBe(true);
    expect(urgent(task('open', '2026-11-04'), TODAY)).toBe(false);
    expect(urgent(task('accepted', '2026-11-04'), TODAY)).toBe(true);
    expect(needsHelper(task('accepted', '2026-11-04'), TODAY)).toBe(false);
  });

  it('a deadline today or already past is urgent for Accepted and needs a helper for Open', () => {
    for (const deadline of ['2026-11-01', '2026-10-31']) {
      expect(urgent(task('accepted', deadline), TODAY)).toBe(true);
      expect(needsHelper(task('open', deadline), TODAY)).toBe(true);
    }
  });

  it('Unassigned, Declined and Can’t be done always need a helper', () => {
    for (const status of ['unassigned', 'declined', 'cant_do'] as const) {
      for (const deadline of [FAR, '2026-11-02', '2026-10-01']) {
        expect(needsHelper(task(status, deadline), TODAY)).toBe(true);
        expect(urgent(task(status, deadline), TODAY)).toBe(false);
      }
    }
  });

  it('a Done task is neither, even overdue', () => {
    expect(needsHelper(task('done', '2026-10-01'), TODAY)).toBe(false);
    expect(urgent(task('done', '2026-10-01'), TODAY)).toBe(false);
  });
});

describe('eventSummary', () => {
  it('a clean event is On track', () => {
    const s = eventSummary([task('accepted'), task('done', '2026-10-01')], EVENT, TODAY);
    expect(s).toMatchObject({ done: 1, total: 2, onTrack: true, past: false, urgent: [], needsHelper: [] });
  });

  it('an Unassigned, Declined or Can’t be done task takes the event off track', () => {
    for (const status of ['unassigned', 'declined', 'cant_do'] as const) {
      const s = eventSummary([task('accepted'), task(status)], EVENT, TODAY);
      expect(s.onTrack).toBe(false);
      expect(s.needsHelper).toHaveLength(1);
    }
  });

  it('counts every status: Done N of all M, Urgent and Needs a helper lists of the original tasks', () => {
    const tasks = [
      task('unassigned'),
      task('open', '2026-11-03'),
      task('accepted', '2026-11-02'),
      task('accepted'),
      task('declined'),
      task('done', '2026-10-20'),
      task('cant_do'),
    ];
    const s = eventSummary(tasks, EVENT, TODAY);
    expect(s.done).toBe(1);
    expect(s.total).toBe(7);
    expect(s.urgent).toEqual([tasks[2]]);
    expect(s.needsHelper).toEqual([tasks[0], tasks[1], tasks[4], tasks[6]]);
    expect(s.onTrack).toBe(false);
  });

  it('days to the event and the next deadline ignore past deadlines and Done tasks', () => {
    const tasks = [task('accepted', '2026-10-31'), task('done', '2026-11-02'), task('cant_do', '2026-11-10'), task('open', '2026-11-05')];
    const s = eventSummary(tasks, { eventDate: '2026-12-01' }, TODAY);
    expect(s.daysToEvent).toBe(30);
    expect(s.nextDeadline).toBe('2026-11-05');
  });

  it('a deadline today is the next deadline; with none left it is null', () => {
    expect(eventSummary([task('accepted', TODAY)], EVENT, TODAY).nextDeadline).toBe(TODAY);
    expect(eventSummary([task('done', '2026-12-01'), task('open', '2026-10-01')], EVENT, TODAY).nextDeadline).toBeNull();
    expect(eventSummary([], EVENT, TODAY)).toMatchObject({ done: 0, total: 0, onTrack: true, nextDeadline: null });
  });

  it('a past event counts neither Urgent nor Needs a helper', () => {
    const s = eventSummary([task('unassigned', '2026-10-20'), task('accepted', '2026-10-30')], { eventDate: '2026-10-31' }, TODAY);
    expect(s).toMatchObject({ past: true, urgent: [], needsHelper: [], onTrack: false, daysToEvent: -1 });
  });

  it('an event today is not past', () => {
    const s = eventSummary([task('unassigned', TODAY)], { eventDate: TODAY }, TODAY);
    expect(s).toMatchObject({ past: false, daysToEvent: 0 });
    expect(s.needsHelper).toHaveLength(1);
  });
});

describe('formatDateTimeNb', () => {
  it('formats in Oslo time and Norwegian', () => {
    const text = formatDateTimeNb('2026-11-01T10:00:00.000Z');
    expect(text).toContain('1. november 2026');
    expect(text).toContain('11:00');
    // Summer time: 10:00Z is 12:00 in Oslo.
    expect(formatDateTimeNb('2026-07-01T10:00:00.000Z')).toContain('12:00');
  });
});
