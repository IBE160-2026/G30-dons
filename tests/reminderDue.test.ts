import { describe, expect, it } from 'vitest';
import { fixedClock } from '../src/clock.ts';
import { TASK_STATUSES, type TaskStatus } from '../src/db/schema.ts';
import { isReminderDue, reminderDueDate } from '../src/domain/reminderDue.ts';

// FR-17, AD-7 (story 3.1): a reminder is due at whichever comes first, 14 days after the yes or
// 3 days before the deadline, and never when the yes came after the 3-day point. Time is simulated
// with a fixed clock; T is 2026-11-20 in Oslo.

const T = fixedClock('2026-11-20T09:00:00.000Z').today();

/** An Accepted task whose yes was given at 10:00 UTC on `yes` (Oslo date) with the given deadline. */
const accepted = (yes: string, deadline: string) => ({
  status: 'accepted' as const,
  acceptedAt: `${yes}T10:00:00.000Z`,
  deadline,
});

describe('reminderDueDate', () => {
  it('uses the 14-day point when it comes first (yes T−14, deadline T+20)', () => {
    const task = accepted('2026-11-06', '2026-12-10');
    expect(reminderDueDate(task)).toBe('2026-11-20');
    expect(isReminderDue(task, T)).toBe(true);
    expect(isReminderDue(task, '2026-11-19')).toBe(false);
  });

  it('uses deadline − 3 when it comes first (yes T−5, deadline T+3)', () => {
    const task = accepted('2026-11-15', '2026-11-23');
    expect(reminderDueDate(task)).toBe('2026-11-20');
    expect(isReminderDue(task, T)).toBe(true);
    expect(isReminderDue(task, '2026-11-19')).toBe(false);
  });

  it('is not due yet one day before the 14-day point (yes T−13, deadline T+20)', () => {
    const task = accepted('2026-11-07', '2026-12-10');
    expect(reminderDueDate(task)).toBe('2026-11-21');
    expect(isReminderDue(task, T)).toBe(false);
  });

  it('is due the same day when the yes comes exactly on the 3-day point (yes T, deadline T+3)', () => {
    const task = accepted('2026-11-20', '2026-11-23');
    expect(reminderDueDate(task)).toBe('2026-11-20');
    expect(isReminderDue(task, T)).toBe(true);
  });

  it('has no due date when the yes comes after the 3-day point (yes T, deadline T+2)', () => {
    const task = accepted('2026-11-20', '2026-11-22');
    expect(reminderDueDate(task)).toBeNull();
    for (const today of [T, '2026-11-22', '2026-12-31']) expect(isReminderDue(task, today)).toBe(false);
  });

  it('stays due on later days, so a late check still finds it', () => {
    const task = accepted('2026-11-06', '2026-12-10');
    expect(isReminderDue(task, '2026-11-30')).toBe(true);
  });

  it('stays due after the deadline has passed while the task is still Accepted (D5)', () => {
    const task = accepted('2026-11-01', '2026-11-10');
    expect(reminderDueDate(task)).toBe('2026-11-07');
    expect(isReminderDue(task, '2026-11-25')).toBe(true);
  });

  it('gives no reminder for any status other than Accepted, even with a yes date', () => {
    const others = TASK_STATUSES.filter((s): s is Exclude<TaskStatus, 'accepted'> => s !== 'accepted');
    expect(others).toEqual(['unassigned', 'open', 'declined', 'done', 'cant_do']);
    for (const status of others) {
      for (const acceptedAt of [null, '2026-11-01T10:00:00.000Z']) {
        const task = { status, acceptedAt, deadline: '2026-12-10' };
        expect(reminderDueDate(task)).toBeNull();
        expect(isReminderDue(task, '2026-12-31')).toBe(false);
      }
    }
  });

  it('gives no reminder for an Accepted task without a yes time', () => {
    const task = { status: 'accepted' as const, acceptedAt: null, deadline: '2026-12-10' };
    expect(reminderDueDate(task)).toBeNull();
    expect(isReminderDue(task, '2026-12-31')).toBe(false);
  });

  it('counts from the Oslo date of the yes, across midnight and the switch to summer time', () => {
    // 23:30 UTC on 28 March 2026 is 00:30 on 29 March in Oslo (summer time starts that night).
    expect(reminderDueDate(accepted('2026-03-28', '2026-12-31'))).toBe('2026-04-11');
    const afterMidnight = {
      status: 'accepted' as const,
      acceptedAt: '2026-03-28T23:30:00.000Z',
      deadline: '2026-12-31',
    };
    expect(reminderDueDate(afterMidnight)).toBe('2026-04-12');
    // 22:30 UTC on 28 March is still 23:30 on 28 March in Oslo.
    const beforeMidnight = {
      status: 'accepted' as const,
      acceptedAt: '2026-03-28T22:30:00.000Z',
      deadline: '2026-12-31',
    };
    expect(reminderDueDate(beforeMidnight)).toBe('2026-04-11');
  });

  it('counts across a month and year boundary', () => {
    expect(reminderDueDate(accepted('2026-12-25', '2027-03-01'))).toBe('2027-01-08');
    expect(reminderDueDate(accepted('2026-12-25', '2027-01-02'))).toBe('2026-12-30');
  });
});
