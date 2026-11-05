import { buildPlan, type PlannedTask } from '../domain/plan.ts';
import type { Template } from '../templates/index.ts';

// The template's default plan as dated tasks. D1 (Story 2.1): it is the mock plan when no AI key
// is set, so no plan data is duplicated, and it is also the fallback when the AI draft fails (FR-6).
// The organizer tells the mock apart from an AI draft by the test-plan notice, not by the tasks.

export function templatePlan(template: Template, eventDate: string, today: string): PlannedTask[] {
  const result = buildPlan(template.defaultPlan, eventDate, today);
  // Template files are validated at startup and their offsets are never negative, so this
  // only fails if a template slips past that check.
  if (!result.ok) throw new Error(`Template ${template.key} produced an invalid plan: ${result.reason}`);
  return result.tasks;
}
