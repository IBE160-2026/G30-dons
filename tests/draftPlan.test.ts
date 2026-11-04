import { mkdirSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { type DraftPlanInput, draftPlan, PLAN_NOTICES, type PlanProvider } from '../src/ai/index.ts';
import { templatePlan } from '../src/ai/mock.ts';
import { events, tasks } from '../src/db/schema.ts';
import { register } from '../src/services/auth.ts';
import { createEvent } from '../src/services/events.ts';
import { addHelperToEvent } from '../src/services/helpers.ts';
import { loadTemplates } from '../src/templates/index.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { setupTestApp, type TestContext } from './helpers.ts';

// Story 2.1: draftPlan with a fake provider (FR-27: no test touches the network).
// Oslo today in tests is 2026-11-01 (FIXED_NOW).

const TODAY = '2026-11-01';
const EVENT_DATE = '2027-06-12';
const DESCRIPTION = 'Mal: Bryllup\nHvor: Molde\nAntall gjester: 80';
const templates = loadTemplates();
const weddingFallback = templatePlan(templates.get('wedding')!, EVENT_DATE, TODAY);

const input = (overrides: Partial<DraftPlanInput> = {}): DraftPlanInput => ({
  templateKey: 'wedding',
  eventDate: EVENT_DATE,
  description: DESCRIPTION,
  forceFailure: false,
  ...overrides,
});

const deps = (overrides: { provider?: PlanProvider; testMode?: boolean; timeoutMs?: number } = {}) => ({
  templates,
  today: TODAY,
  testMode: true,
  ...overrides,
});

const answering =
  (output: unknown): PlanProvider =>
  async () =>
    output;

const validPlan = [
  { title: 'Bestille lokale', daysBeforeEvent: 150 },
  { title: 'Sende invitasjoner', daysBeforeEvent: 60 },
];

let warn: MockInstance;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** The fallback reason is logged, and the description never is. */
function expectLoggedReason(reason: 'error' | 'timeout' | 'invalid_plan' | 'forced') {
  const logged = warn.mock.calls.flat().map(String).join(' ');
  expect(logged).toContain(reason);
  expect(logged).not.toContain('Molde');
}

function expectFallback(result: Awaited<ReturnType<typeof draftPlan>>) {
  expect(result).toEqual({ tasks: weddingFallback, source: 'fallback', notice: PLAN_NOTICES.fallback });
}

describe('draftPlan without a provider (no key)', () => {
  it('returns the template plan as a mock, with the test-plan notice', async () => {
    const result = await draftPlan(input(), deps());
    expect(result).toEqual({ tasks: weddingFallback, source: 'mock', notice: PLAN_NOTICES.mock });
  });

  it('uses the mock plan of the chosen template', async () => {
    const result = await draftPlan(input({ templateKey: 'bachelorette' }), deps());
    expect(result.tasks).toEqual(templatePlan(templates.get('bachelorette')!, EVENT_DATE, TODAY));
    expect(result.source).toBe('mock');
  });
});

describe('draftPlan with a provider', () => {
  it('uses a valid AI plan, with no notice', async () => {
    const result = await draftPlan(input(), deps({ provider: answering(validPlan) }));
    expect(result).toEqual({
      tasks: [
        { title: 'Bestille lokale', deadline: '2027-01-13' },
        { title: 'Sende invitasjoner', deadline: '2027-04-13' },
      ],
      source: 'ai',
    });
    expect(result.notice).toBeUndefined();
  });

  it('moves a deadline before today to today and keeps the plan', async () => {
    const result = await draftPlan(
      input(),
      deps({ provider: answering([{ title: 'Sette budsjett', daysBeforeEvent: 400 }]) }),
    );
    expect(result).toEqual({ tasks: [{ title: 'Sette budsjett', deadline: TODAY }], source: 'ai' });
  });

  it('falls back to the template plan when the provider throws', async () => {
    const provider: PlanProvider = async () => {
      throw new Error('503 from the AI service');
    };
    expectFallback(await draftPlan(input(), deps({ provider })));
    expectLoggedReason('error');
  });

  it.each([
    ['an empty object', {}],
    ['a string', 'Her er planen din'],
    ['null', null],
    ['items missing a title', [{ daysBeforeEvent: 10 }]],
    ['a title that is not a string', [{ title: 42, daysBeforeEvent: 10 }]],
    ['a non-integer offset', [{ title: 'Bestille kake', daysBeforeEvent: 2.5 }]],
  ])('falls back on output of the wrong shape: %s', async (_label, output) => {
    expectFallback(await draftPlan(input(), deps({ provider: answering(output) })));
    expectLoggedReason('invalid_plan');
  });

  it.each([
    ['0 tasks', []],
    ['41 tasks', Array.from({ length: 41 }, (_, i) => ({ title: `Oppgave ${i + 1}`, daysBeforeEvent: i }))],
    ['a 121-character title', [{ title: 'x'.repeat(121), daysBeforeEvent: 10 }]],
    ['a deadline after the event', [{ title: 'Rydde lokalet', daysBeforeEvent: -1 }]],
  ])('falls back on an invalid plan: %s', async (_label, output) => {
    expectFallback(await draftPlan(input(), deps({ provider: answering(output) })));
    expectLoggedReason('invalid_plan');
  });

  it('accepts exactly 40 tasks and a 120-character title', async () => {
    const plan = Array.from({ length: 40 }, (_, i) => ({
      title: i === 0 ? 'x'.repeat(120) : `Oppgave ${i}`,
      daysBeforeEvent: i,
    }));
    const result = await draftPlan(input(), deps({ provider: answering(plan) }));
    expect(result.source).toBe('ai');
    expect(result.tasks).toHaveLength(40);
  });
});

describe('draftPlan timeout (NFR-6)', () => {
  it('waits 30 s by default, then aborts the request and falls back', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const provider: PlanProvider = (_request, s) => {
      signal = s;
      return new Promise(() => {});
    };
    let settled = false;
    const pending = draftPlan(input(), deps({ provider })).finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).toBe(false);
    expect(signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expectFallback(await pending);
    expect(signal?.aborted).toBe(true);
    expectLoggedReason('timeout');
  });

  it('clears its timer when the provider answers in time', async () => {
    vi.useFakeTimers();
    await draftPlan(input(), deps({ provider: answering(validPlan) }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back and clears its timer when the provider throws before returning a promise', async () => {
    vi.useFakeTimers();
    const provider: PlanProvider = () => {
      throw new Error('kastet med en gang');
    };
    expectFallback(await draftPlan(input(), deps({ provider })));
    expectLoggedReason('error');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('draftPlan forced failure (D4)', () => {
  it('falls back without calling the provider when test mode is on', async () => {
    const provider = vi.fn(answering(validPlan));
    expectFallback(await draftPlan(input({ forceFailure: true }), deps({ provider, testMode: true })));
    expect(provider).not.toHaveBeenCalled();
    expectLoggedReason('forced');
  });

  it('falls back, not to the mock, when test mode is on and there is no provider (no key)', async () => {
    expectFallback(await draftPlan(input({ forceFailure: true }), deps({ testMode: true })));
    expectLoggedReason('forced');
  });

  it('is ignored when test mode is off: the provider plan is used', async () => {
    const provider = vi.fn(answering(validPlan));
    const result = await draftPlan(input({ forceFailure: true }), deps({ provider, testMode: false }));
    expect(result.source).toBe('ai');
    expect(provider).toHaveBeenCalledOnce();
  });
});

describe('draftPlan privacy (NFR-3)', () => {
  it('sends the provider exactly templateKey, eventDate and description', async () => {
    const provider = vi.fn(answering(validPlan));
    await draftPlan(input({ forceFailure: false }), deps({ provider, testMode: false }));
    const [request, signal] = provider.mock.calls[0]!;
    expect(request).toStrictEqual({ templateKey: 'wedding', eventDate: EVENT_DATE, description: DESCRIPTION });
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});

describe('createEvent with draftPlan', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    mkdirSync(TEST_DB_DIR, { recursive: true });
    ctx = await setupTestApp();
  });

  afterEach(() => {
    ctx.close();
  });

  async function organizer(email = 'kari@example.no') {
    return register(ctx.db, ctx.clock, { name: 'Kari', email, password: 'hemmelig123' });
  }

  const weddingInput = {
    templateKey: 'wedding',
    name: 'Bryllupet til Kari og Ola',
    occasion: 'Bryllup i kirken',
    location: 'Molde',
    eventDate: EVENT_DATE,
    guestCount: 80,
    todo: 'Lokale og mat',
    otherInfo: 'Sommerbryllup',
  };

  const eventTasks = (eventId: number) =>
    ctx.db.select().from(tasks).where(eq(tasks.eventId, eventId)).orderBy(tasks.id);

  it('runs the provider before any event row exists, and creates only Unassigned tasks', async () => {
    const { id } = await organizer();
    let rowsWhileDrafting: number | undefined;
    const provider: PlanProvider = async () => {
      rowsWhileDrafting = (await ctx.db.select().from(events)).length;
      return validPlan;
    };
    const result = await createEvent(ctx.db, ctx.clock, templates, id, weddingInput, { testMode: true, provider });

    expect(rowsWhileDrafting).toBe(0);
    expect(result.notice).toBeUndefined();
    const rows = await eventTasks(result.eventId);
    expect(rows.map((t) => t.title)).toEqual(['Bestille lokale', 'Sende invitasjoner']);
    expect(rows.every((t) => t.status === 'unassigned' && t.helperId === null)).toBe(true);
  });

  it('creates the event with the template plan and the fallback notice when the provider fails', async () => {
    const { id } = await organizer();
    const provider: PlanProvider = async () => {
      throw new Error('nede');
    };
    const result = await createEvent(ctx.db, ctx.clock, templates, id, weddingInput, { testMode: true, provider });

    expect(result.notice).toBe(PLAN_NOTICES.fallback);
    const rows = await eventTasks(result.eventId);
    expect(rows).toHaveLength(weddingFallback.length);
    expect(rows.every((t) => t.status === 'unassigned' && t.helperId === null)).toBe(true);
  });

  it('creates the event with the mock plan and its notice when there is no provider', async () => {
    const { id } = await organizer();
    const result = await createEvent(ctx.db, ctx.clock, templates, id, weddingInput, { testMode: true });
    expect(result.notice).toBe(PLAN_NOTICES.mock);
    expect(await eventTasks(result.eventId)).toHaveLength(weddingFallback.length);
  });

  it('honours forceFailure only in test mode', async () => {
    const { id } = await organizer();
    const provider = answering(validPlan);
    const forced = await createEvent(ctx.db, ctx.clock, templates, id, weddingInput, {
      testMode: true,
      provider,
      forceFailure: true,
    });
    expect(forced.notice).toBe(PLAN_NOTICES.fallback);
    const ignored = await createEvent(ctx.db, ctx.clock, templates, id, weddingInput, {
      testMode: false,
      provider,
      forceFailure: true,
    });
    expect(ignored.notice).toBeUndefined();
    expect(await eventTasks(ignored.eventId)).toHaveLength(validPlan.length);
  });

  it('describes the event from its form fields only: no event name and no helper data (D2)', async () => {
    const { id } = await organizer();
    const other = await createEvent(
      ctx.db,
      ctx.clock,
      templates,
      id,
      { templateKey: 'bachelorette', eventDate: '2027-03-01' },
      { testMode: true },
    );
    await addHelperToEvent(ctx.db, ctx.clock, id, other.eventId, {
      email: 'siri.hjelper@example.no',
      name: 'Siri Hjelper',
    });

    const provider = vi.fn(answering(validPlan));
    await createEvent(ctx.db, ctx.clock, templates, id, weddingInput, { testMode: true, provider });

    const [request] = provider.mock.calls[0]!;
    expect(Object.keys(request).sort()).toEqual(['description', 'eventDate', 'templateKey']);
    expect(request.templateKey).toBe('wedding');
    expect(request.eventDate).toBe(EVENT_DATE);
    for (const line of [
      'Mal: Bryllup',
      'Hva: Bryllup i kirken',
      'Hvor: Molde',
      'Antall gjester: 80',
      'Hva må gjøres: Lokale og mat',
      'Annen informasjon: Sommerbryllup',
    ]) {
      expect(request.description).toContain(line);
    }
    for (const secret of ['Kari og Ola', 'Siri', 'siri.hjelper@example.no', 'kari@example.no']) {
      expect(request.description).not.toContain(secret);
    }
  });

  it('leaves empty fields out of the description', async () => {
    const { id } = await organizer();
    const provider = vi.fn(answering(validPlan));
    await createEvent(
      ctx.db,
      ctx.clock,
      templates,
      id,
      { templateKey: 'bachelorette', location: '  ', eventDate: '2027-03-01' },
      { testMode: true, provider },
    );
    const [request] = provider.mock.calls[0]!;
    expect(request.description).toBe('Mal: Utdrikningslag');
  });
});
