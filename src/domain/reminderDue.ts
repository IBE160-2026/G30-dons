import type { TaskStatus } from '../db/schema.ts';
import { addDays, osloDate } from './dates.ts';

// FR-17, AD-7: when a reminder is due. Computed when the check runs, never stored, so deadline
// edits need no rescheduling.

/** Days after the yes when the reminder is due, unless the deadline comes first. */
export const REMINDER_DAYS_AFTER_YES = 14;
/** Days before the deadline when the reminder is due at the latest. */
export const REMINDER_DAYS_BEFORE_DEADLINE = 3;

export interface ReminderTask {
  status: TaskStatus;
  acceptedAt: string | null;
  deadline: string;
}

/**
 * The Oslo date the reminder for this yes is due: the earlier of 14 days after the yes and 3 days
 * before the deadline. Null when the task is not Accepted, or when the yes came after the 3-day
 * point (the task is then Urgent instead).
 */
export function reminderDueDate(task: ReminderTask): string | null {
  if (task.status !== 'accepted' || task.acceptedAt === null) return null;
  const yes = osloDate(task.acceptedAt);
  const beforeDeadline = addDays(task.deadline, -REMINDER_DAYS_BEFORE_DEADLINE);
  if (yes > beforeDeadline) return null;
  const afterYes = addDays(yes, REMINDER_DAYS_AFTER_YES);
  return afterYes < beforeDeadline ? afterYes : beforeDeadline;
}

/** True from the due date on, so a late check still finds a missed reminder. */
export function isReminderDue(task: ReminderTask, today: string): boolean {
  const due = reminderDueDate(task);
  return due !== null && due <= today;
}
