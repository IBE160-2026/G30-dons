import { addDays, isoWeekday } from './dates.ts';
import type { TaskStatus } from './taskRules.ts';

// Story 5.1 (EXPERIENCE.md → Voice and Tone, Component Patterns): the greeting by the time of day,
// the overview sentence and the week groups «Denne uka» and «Neste uke» (D3). Pure: no clock.

/** «God morgen» 05–09, «God dag» 10–16, «God kveld» 17–04, by the Oslo hour. */
export function greeting(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError(`Not an hour: ${hour}`);
  if (hour >= 5 && hour < 10) return 'God morgen';
  if (hour >= 10 && hour < 17) return 'God dag';
  return 'God kveld';
}

const NUMBER_WORDS = ['', 'Ett', 'To', 'Tre', 'Fire', 'Fem', 'Seks', 'Sju', 'Åtte', 'Ni', 'Ti'];
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/**
 * The plain sentence under the greeting: how many events are in progress, and how many of them
 * need attention, for example «To arrangementer er i gang. Ett trenger deg litt nå.»
 */
export function overviewSentence(inProgress: number, needAttention: number): string {
  if (inProgress === 0) return 'Ingen arrangementer er i gang.';
  const first = inProgress === 1 ? 'Ett arrangement er i gang.' : `${numberWord(inProgress)} arrangementer er i gang.`;
  if (needAttention === 0) return `${first} Alt er i rute.`;
  if (inProgress === 1) return `${first} Det trenger deg litt nå.`;
  return `${first} ${numberWord(needAttention)} trenger deg litt nå.`;
}

export interface WeekTask {
  id: number;
  status: TaskStatus;
  /** YYYY-MM-DD */
  deadline: string;
}

export interface WeekGroups<T extends WeekTask> {
  /** Today to Sunday. */
  thisWeek: T[];
  /** Next Monday to Sunday. */
  nextWeek: T[];
}

/**
 * D3: tasks due in the rest of this Monday–Sunday week and in the next one, sorted by deadline.
 * Done tasks and the tasks in `exclude` (already in «Trenger deg nå») are left out.
 */
export function weekGroups<T extends WeekTask>(
  tasks: readonly T[],
  today: string,
  exclude: ReadonlySet<number>,
): WeekGroups<T> {
  const sunday = addDays(today, 7 - isoWeekday(today));
  const nextSunday = addDays(sunday, 7);
  const due = tasks
    .filter((t) => t.status !== 'done' && !exclude.has(t.id) && t.deadline >= today && t.deadline <= nextSunday)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  return {
    thisWeek: due.filter((t) => t.deadline <= sunday),
    nextWeek: due.filter((t) => t.deadline > sunday),
  };
}

/** Tasks sorted by deadline, as one entry per day. */
export function byDay<T extends { deadline: string }>(tasks: readonly T[]): { date: string; tasks: T[] }[] {
  const days: { date: string; tasks: T[] }[] = [];
  for (const task of tasks) {
    const last = days.at(-1);
    if (last && last.date === task.deadline) last.tasks.push(task);
    else days.push({ date: task.deadline, tasks: [task] });
  }
  return days;
}
