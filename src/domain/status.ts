import { addDays, daysBetween, osloDate } from './dates.ts';
import type { TaskStatus } from './taskRules.ts';

// AD-3, FR-21: the derived states Urgent, Needs a helper and On track, the Done count, days to the
// event and the next deadline. Computed from (tasks, event, today) on every page load; never stored.
// Pure: no clock, no database. All date maths goes through dates.ts (AD-4).

export interface StatusTask {
  status: TaskStatus;
  /** YYYY-MM-DD */
  deadline: string;
  /** UTC ISO timestamp of the last assignment, or null. */
  assignedAt: string | null;
}

export interface StatusEvent {
  /** YYYY-MM-DD */
  eventDate: string;
}

/** An Open task with no answer after this many Oslo calendar days needs a helper. */
export const OPEN_STALE_DAYS = 7;
/** A deadline at most this many days from today is close. */
export const CLOSE_DEADLINE_DAYS = 3;

const deadlineIsClose = (task: StatusTask, today: string) => task.deadline <= addDays(today, CLOSE_DEADLINE_DAYS);

/** Needs a helper: Unassigned, Declined or Can't be done; or Open for 7+ days; or Open with a close deadline. */
export function needsHelper(task: StatusTask, today: string): boolean {
  switch (task.status) {
    case 'unassigned':
    case 'declined':
    case 'cant_do':
      return true;
    case 'open':
      if (deadlineIsClose(task, today)) return true;
      return task.assignedAt !== null && daysBetween(osloDate(task.assignedAt), today) >= OPEN_STALE_DAYS;
    default:
      return false;
  }
}

/** Urgent: an Accepted task with deadline today + 3 or earlier (past deadlines included). */
export function urgent(task: StatusTask, today: string): boolean {
  return task.status === 'accepted' && deadlineIsClose(task, today);
}

export interface EventSummary<T extends StatusTask> {
  /** N in "N av M ferdig". */
  done: number;
  /** M: all the event's tasks. */
  total: number;
  urgent: T[];
  needsHelper: T[];
  /** No Urgent and no Needs a helper task, and the event is not over. */
  onTrack: boolean;
  /** The event date is before today; such events count neither Urgent nor Needs a helper. */
  past: boolean;
  /** Days from today to the event (negative once it is over). */
  daysToEvent: number;
  /** Earliest deadline >= today among tasks that are not Done, or null. */
  nextDeadline: string | null;
}

export function eventSummary<T extends StatusTask>(
  tasks: readonly T[],
  event: StatusEvent,
  today: string,
): EventSummary<T> {
  const past = event.eventDate < today;
  const urgentTasks = past ? [] : tasks.filter((t) => urgent(t, today));
  const needsHelperTasks = past ? [] : tasks.filter((t) => needsHelper(t, today));

  let nextDeadline: string | null = null;
  for (const t of tasks) {
    if (t.status === 'done' || t.deadline < today) continue;
    if (nextDeadline === null || t.deadline < nextDeadline) nextDeadline = t.deadline;
  }

  return {
    done: tasks.filter((t) => t.status === 'done').length,
    total: tasks.length,
    urgent: urgentTasks,
    needsHelper: needsHelperTasks,
    onTrack: !past && urgentTasks.length === 0 && needsHelperTasks.length === 0,
    past,
    daysToEvent: daysBetween(today, event.eventDate),
    nextDeadline,
  };
}
