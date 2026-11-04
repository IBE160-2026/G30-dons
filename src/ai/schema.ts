import { z } from 'zod';

// AD-8: the shape a provider must answer with, the same { title, daysBeforeEvent } plan shape as
// the templates. Only the shape is checked here; the plan rules (task count, title length,
// deadlines) are checked once, by domain/plan.buildPlan.

export const aiPlanSchema = z.array(
  z.object({
    title: z.string(),
    daysBeforeEvent: z.number().int(),
  }),
);
