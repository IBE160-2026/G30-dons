import { buildPlan, type PlannedTask } from '../domain/plan.ts';
import type { Template } from '../templates/index.ts';

// The seam where Epic 2 puts ai/draftPlan. For now the template's default plan is the plan.

export function templatePlan(template: Template, eventDate: string, today: string): PlannedTask[] {
  const result = buildPlan(template.defaultPlan, eventDate, today);
  // Template files are validated at startup and their offsets are never negative, so this
  // only fails if a template slips past that check.
  if (!result.ok) throw new Error(`Template ${template.key} produced an invalid plan: ${result.reason}`);
  return result.tasks;
}
