import { buildPlan, type PlannedTask } from '../domain/plan.ts';
import type { TemplateKey, Templates } from '../templates/index.ts';
import { templatePlan } from './mock.ts';
import { aiPlanSchema } from './schema.ts';

// AD-8: the only AI entry point. Every plan, whatever its source, goes through
// domain/plan.buildPlan, and the template's default plan is the fallback (FR-5, FR-6).
// With no provider (no API key) the mock plan is used (FR-23). Provider problems never throw.

/** Exactly what a provider receives (NFR-3): never an event name or helper data. */
export interface PlanRequest {
  templateKey: TemplateKey;
  eventDate: string;
  description: string;
}

/** Answers with raw output, which draftPlan validates. Must stop work when `signal` aborts. */
export type PlanProvider = (request: PlanRequest, signal: AbortSignal) => Promise<unknown>;

export interface DraftPlanInput extends PlanRequest {
  forceFailure: boolean;
}

export interface DraftPlanDeps {
  templates: Templates;
  today: string;
  testMode: boolean;
  provider?: PlanProvider | undefined;
  timeoutMs?: number | undefined;
}

export type PlanSource = 'ai' | 'mock' | 'fallback';

export interface DraftPlanResult {
  tasks: PlannedTask[];
  source: PlanSource;
  notice?: string;
}

/** NFR-6: a provider call longer than this falls back. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** The organizer's notice for each plan that is not an AI draft. */
export const PLAN_NOTICES = {
  mock: 'Planen er en testplan fra malen, fordi ingen AI-nøkkel er satt opp.',
  fallback: 'AI-utkastet kunne ikke brukes, så planen er malens standardplan.',
} as const;

type FallbackReason = 'error' | 'timeout' | 'invalid_plan' | 'forced';

export async function draftPlan(input: DraftPlanInput, deps: DraftPlanDeps): Promise<DraftPlanResult> {
  const template = deps.templates.get(input.templateKey);
  if (!template) throw new Error(`Unknown template ${input.templateKey}`);
  const fallback = (reason: FallbackReason): DraftPlanResult => {
    // The description is never logged: it is the organizer's own text.
    console.warn(`draftPlan: using the template plan for ${template.key} (reason: ${reason})`);
    return {
      tasks: templatePlan(template, input.eventDate, deps.today),
      source: 'fallback',
      notice: PLAN_NOTICES.fallback,
    };
  };

  // D4: a forced failure is a test-mode tool only. It falls back with or without a provider, so
  // the Simulate AI failure toggle also works without a key.
  if (input.forceFailure && deps.testMode) return fallback('forced');

  if (!deps.provider) {
    return { tasks: templatePlan(template, input.eventDate, deps.today), source: 'mock', notice: PLAN_NOTICES.mock };
  }

  const request: PlanRequest = {
    templateKey: input.templateKey,
    eventDate: input.eventDate,
    description: input.description,
  };
  const answer = await callWithTimeout(deps.provider, request, deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!answer.ok) return fallback(answer.reason);

  const shape = aiPlanSchema.safeParse(answer.output);
  if (!shape.success) return fallback('invalid_plan');
  const plan = buildPlan(shape.data, input.eventDate, deps.today);
  if (!plan.ok) return fallback('invalid_plan');
  return { tasks: plan.tasks, source: 'ai' };
}

type ProviderAnswer = { ok: true; output: unknown } | { ok: false; reason: 'error' | 'timeout' };

async function callWithTimeout(
  provider: PlanProvider,
  request: PlanRequest,
  timeoutMs: number,
): Promise<ProviderAnswer> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<ProviderAnswer>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, reason: 'timeout' });
    }, timeoutMs);
  });
  try {
    const answered = provider(request, controller.signal).then(
      (output): ProviderAnswer => ({ ok: true, output }),
      (): ProviderAnswer => ({ ok: false, reason: 'error' }),
    );
    return await Promise.race([answered, timedOut]);
  } catch {
    // A provider that throws before returning a promise.
    return { ok: false, reason: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
