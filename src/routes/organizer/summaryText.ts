import type { EventSummary, StatusTask } from '../../domain/status.ts';

// Norwegian one-line texts for the summaries computed by domain/status.ts. Wording only:
// every state and count comes in ready-made from the summary.

/** "1 haster · 2 trenger hjelper", leaving out zero parts; empty when both are zero. */
export function attentionText(summary: EventSummary<StatusTask>): string {
  const parts: string[] = [];
  if (summary.urgent.length > 0) parts.push(`${summary.urgent.length} haster`);
  if (summary.needsHelper.length > 0) parts.push(`${summary.needsHelper.length} trenger hjelper`);
  return parts.join(' · ');
}

/** The overview line for an event: over, on track, or what needs attention. */
export function overviewStatusText(summary: EventSummary<StatusTask>): string {
  if (summary.past) return 'Arrangementet er over';
  if (summary.onTrack) return 'I rute';
  return attentionText(summary);
}

/** The To do panel line: "N haster · M trenger hjelper", or "Ingenting haster". */
export function todoText(summary: EventSummary<StatusTask>): string {
  if (summary.past) return 'Arrangementet er over';
  if (summary.onTrack) return 'Ingenting haster';
  return `${summary.urgent.length} haster · ${summary.needsHelper.length} trenger hjelper`;
}

const days = (n: number) => (n === 1 ? '1 dag' : `${n} dager`);

/** "Om N dager", "I dag" or "Var for N dager siden". */
export function daysToEventText(daysToEvent: number): string {
  if (daysToEvent === 0) return 'I dag';
  return daysToEvent > 0 ? `Om ${days(daysToEvent)}` : `Var for ${days(-daysToEvent)} siden`;
}

export const newRepliesText = (n: number) => `${n} ${n === 1 ? 'nytt svar' : 'nye svar'}`;
