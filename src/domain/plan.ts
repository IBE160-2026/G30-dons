import { addDays, isDate } from './dates.ts';

// AD-8: the one plan validator. Every plan (template now, AI and mock in Epic 2) is a list of
// { title, daysBeforeEvent } entries that becomes dated tasks here.

export const MAX_PLAN_TASKS = 40;
export const MAX_TITLE_LENGTH = 120;
/** About ten years; keeps date maths inside the range JavaScript dates can represent. */
export const MAX_OFFSET_DAYS = 3650;

export interface PlanEntry {
  title: string;
  daysBeforeEvent: number;
}

export interface PlannedTask {
  title: string;
  deadline: string;
}

export type PlanResult =
  | { ok: true; tasks: PlannedTask[] }
  | { ok: false; reason: 'no_tasks' | 'too_many_tasks' | 'bad_title' | 'bad_offset' | 'after_event' };

export function buildPlan(entries: readonly PlanEntry[], eventDate: string, today: string): PlanResult {
  if (entries.length === 0) return { ok: false, reason: 'no_tasks' };
  if (entries.length > MAX_PLAN_TASKS) return { ok: false, reason: 'too_many_tasks' };

  const tasks: PlannedTask[] = [];
  for (const entry of entries) {
    const title = entry.title.trim();
    if (title.length === 0 || title.length > MAX_TITLE_LENGTH) return { ok: false, reason: 'bad_title' };
    if (!Number.isInteger(entry.daysBeforeEvent) || Math.abs(entry.daysBeforeEvent) > MAX_OFFSET_DAYS) {
      return { ok: false, reason: 'bad_offset' };
    }

    const deadline = addDays(eventDate, -entry.daysBeforeEvent);
    if (!isDate(deadline)) return { ok: false, reason: 'bad_offset' };
    if (deadline > eventDate) return { ok: false, reason: 'after_event' };
    // A deadline before today is moved to today; this does not make the plan invalid.
    tasks.push({ title, deadline: deadline < today ? today : deadline });
  }
  return { ok: true, tasks };
}
