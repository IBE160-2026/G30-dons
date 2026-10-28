---
title: 'Story 2.1: AI plan draft with mock and fallback'
type: 'feature'
created: '2026-10-28'
status: 'draft'
baseline_commit: 'c601029dc95fd8d23b505d0bf7e4339aedb58b6b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
  - '{project-root}/docs/cost-and-mock-plan.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Today every event gets its template's default plan through `services/plans.templatePlan`. The brief and PRD make an AI-drafted plan a Must (FR-5), with the template plan as the fallback when the AI fails (FR-6), and the app must run without any key (FR-23). There is no `ai/` module, no `draftPlan`, no fallback path and no notice telling the organizer which plan she got.

**Approach:** Add the `ai/` module from the Structural Seed with one entry point, `draftPlan`, that takes a provider seam. With no provider (no key), it returns the mock plan with `source: 'mock'`. With a provider, it validates the output with zod and `domain/plan.ts`, and falls back to the template plan with `source: 'fallback'` on any error, timeout, invalid plan or forced failure. `createEvent` calls `draftPlan` before its transaction and shows the notice. The real Anthropic provider is Story 2.2; the Simulate AI failure toggle is Story 4.2.

**Decisions (proposed 2026-10-28, to be confirmed by the user):**
- **D1 Mock plan = the template's default plan, labelled as a test plan.** `ai/mock.ts` returns each template's `defaultPlan`, so no plan data is duplicated, the seed's `EXPECTED_COUNTS` stay valid, and existing tests keep their task lists. The organizer sees the difference through the notice, not the tasks. (Alternative: separate mock plans per template, which would change the seed, `docs/fixtures.md` and many tests.)
- **D2 The description is built from the event form fields** that describe the event: Hva, Hvor, Antall gjester, Hva må gjøres and Annen informasjon, plus the template name. The event name is left out, because it may contain the couple's names. Helper names and emails are never part of it (NFR-3).
- **D3 No `ANTHROPIC_API_KEY` in config yet.** Story 2.2 adds the key and `ai/anthropic.ts`. In 2.1 the app always runs without a provider, so it always uses the mock; the provider seam is exercised only by tests.
- **D4 `forceFailure` is a parameter only.** `createEvent` accepts it, and `draftPlan` honours it only when `TEST_MODE` is on. The route passes `false` until Story 4.2 adds the session toggle.
- **D5 The plan source is shown, not stored.** The notice is part of the flash shown after the event is created. No migration; a `plan_source` column can be added later if a story needs it.

## Boundaries & Constraints

**Always:**
- `ai/index.ts` exports `draftPlan(input, deps)`, the only AI entry point (AD-8). `input` is `{ templateKey, eventDate, description, forceFailure }`; `deps` is `{ templates, today, testMode, provider?, timeoutMs? }`. It returns `{ tasks: PlannedTask[], source: 'ai' | 'mock' | 'fallback', notice?: string }`. It never throws for provider problems.
- `ai/schema.ts` holds the zod schema for provider output: a list of `{ title: string, daysBeforeEvent: integer }`, the same plan shape as the templates (AD-8).
- `ai/mock.ts` returns the mock plan for a template key (D1).
- A provider is `(request: { templateKey, eventDate, description }, signal: AbortSignal) => Promise<unknown>`. `draftPlan` passes only these three fields.
- Every plan, whatever its source, goes through `domain/plan.buildPlan` (FR-5, FR-6). The template's default plan is the fallback.
- Timeout: `timeoutMs` defaults to 30 000 ms (NFR-6). On timeout the signal is aborted and the fallback is used.
- `createEvent` calls `draftPlan` **before** `db.transaction`, and every created task is Unassigned (AD-8, AD-2).
- Notices are Norwegian and come from one place (`domain/errors.ts` style registry or `ai/index.ts` constants, not inline in the route).
- On fallback, the reason (`error`, `timeout`, `invalid_plan` or `forced`) is logged without the description.
- The event form shows the disclosure notice above the submit button (NFR-3, AD-8).
- Tests use a fake provider and never touch the network (FR-27).

**Never:** `@anthropic-ai/sdk`, `ai/anthropic.ts` or `ANTHROPIC_API_KEY` in config (2.2); the Simulate AI failure toggle or any `/test/*` route (4.2); a database column for the plan source (D5); helper data in `draftPlan`'s input; `forceFailure` taking effect with `TEST_MODE=false`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Form disclosure | GET `/events/new` | page contains the AI notice and that helpers' names and emails are never sent | N/A |
| No key | no provider | mock plan, `source: 'mock'`, test-plan notice; event created | N/A |
| AI success | fake provider returns a valid plan | that plan, `source: 'ai'`, no notice | N/A |
| Provider throws | fake provider rejects | template plan, `source: 'fallback'`, fallback notice; event created | reason `error` logged |
| Timeout | fake provider never resolves, 30 s pass (fake timers) | fallback; signal aborted | reason `timeout` logged |
| Wrong shape | provider returns `{}`, a string, or items missing `title` | fallback | reason `invalid_plan` |
| Invalid plan | 0 tasks, 41 tasks, a title over 120 chars, or a deadline after the event | fallback | reason `invalid_plan` |
| Past deadline | valid plan with an offset before today | deadline set to today; plan accepted | N/A |
| Forced failure, test mode | `forceFailure: true`, `testMode: true`, valid provider | fallback, provider not called | reason `forced` |
| Forced failure, production | `forceFailure: true`, `testMode: false` | provider used as normal | N/A |
| Order of work | provider called during `createEvent` | no event row exists yet when the provider runs | N/A |
| Unassigned | any source | every created task is Unassigned with no helper | N/A |
| Privacy | event with helpers on other events | provider request has exactly `templateKey`, `eventDate`, `description`; no event name, no helper data | N/A |

</frozen-after-approval>

## Code Map

Reuse the Epic 1 scaffold; don't restructure it.

- `src/services/plans.ts` -- `templatePlan(template, eventDate, today)`; the comment marks it as the Epic 2 seam. It becomes the fallback (and the mock, per D1), called from `ai/`.
- `src/services/events.ts` -- `createEvent(db, clock, templates, organizerId, input)` calls `templatePlan` before `db.transaction`; replace that call with `draftPlan` and return the notice with the id.
- `src/domain/plan.ts` -- `buildPlan`, `MAX_PLAN_TASKS`, `MAX_TITLE_LENGTH`, `MAX_OFFSET_DAYS`; already enforces every rule in AC 3 and is unit-tested in `tests/plan.test.ts`. Only the schema check of provider output is new.
- `src/templates/index.ts` -- `templateSchema`, `Templates`, `TemplateKey`; reuse the entry schema for `ai/schema.ts`.
- `src/routes/organizer/events.ts` -- POST `/events` sets the flash "Arrangementet er opprettet."; add the notice.
- `src/views/event-new.ejs` -- add the disclosure notice.
- `src/app.ts` -- builds the routes with `config`; pass `testMode` (and later the provider) to the event service.
- `seed/seed.ts` -- calls `createEvent` twice; follows the new signature. With D1 its counts don't change.
- `tests/insertGuards.test.ts` -- calls `createEvent` directly; follows the new signature.

## Tasks & Acceptance

**Execution:**
- [ ] `tests/draftPlan.test.ts` -- written first, from the matrix: every source, every fallback reason, timeout with fake timers, forced failure in both modes, privacy of the request -- FR-5, FR-6, FR-23, NFR-3, NFR-6
- [ ] `src/ai/schema.ts`, `src/ai/mock.ts`, `src/ai/index.ts` -- `draftPlan`, provider type, notices -- AD-8
- [ ] `src/services/events.ts` -- call `draftPlan` before the transaction; build the description (D2); accept `forceFailure` -- AD-8, AD-2
- [ ] `src/routes/organizer/events.ts`, `src/views/event-new.ejs` -- notice in the flash; disclosure on the form -- FR-23, NFR-3
- [ ] `seed/seed.ts`, `tests/insertGuards.test.ts`, `tests/events.test.ts` -- follow the new signature; events tests assert the mock notice and the order of work
- [ ] `src/services/plans.ts` -- update the Epic 2 comment
- [ ] Docs: `docs/traceability.md` (story 2.1 rows and FR-5/FR-6/FR-23 moved from «Ikke bygget ennå»), README «Kjente begrensninger», `docs/cost-and-mock-plan.md` if the mock text changes, `sprint-status.yaml`

**Acceptance Criteria** (each names the test that proves it):
1. Given GET `/events/new`, then the page contains a Norwegian notice that the description is sent to an AI service and that helpers' names and emails are never sent. *Test:* `tests/events.test.ts`.
2. Given no provider, when `draftPlan` runs, then it returns the template's mock plan with `source: 'mock'` and a test-plan notice; and when an event is created over HTTP, the event page shows that notice. *Tests:* `tests/draftPlan.test.ts`, `tests/events.test.ts`.
3. Given a provider plan that doesn't match the schema, has 0 or 41 tasks, has a 121-character title, or has a deadline after the event, then `draftPlan` returns the template plan with `source: 'fallback'`; and given a valid plan with a past offset, the deadline becomes today. *Tests:* `tests/draftPlan.test.ts` (one case per rule), `tests/plan.test.ts` (existing `buildPlan` rules).
4. Given a provider that throws, or never answers for 30 s, or `forceFailure: true` with `testMode: true`, then the result is the template plan with `source: 'fallback'` and a Norwegian notice, and `createEvent` still creates the event. Given `forceFailure: true` with `testMode: false`, the provider's plan is used. *Test:* `tests/draftPlan.test.ts`, plus one `createEvent` fallback case.
5. Given `createEvent` with a fake provider, then the provider runs before any event row exists, and every created task is Unassigned with no helper. *Test:* `tests/draftPlan.test.ts` or `tests/events.test.ts`.
6. Given any `draftPlan` call, then the provider receives exactly `{ templateKey, eventDate, description }`, and the description contains no event name and no helper data. *Test:* `tests/draftPlan.test.ts`.
7. Given `npm test`, then no test opens a network connection; all tests pass, and `npm run typecheck` and `npm run lint` are clean.

## Definition of Done

From `CLAUDE.md`. The story is done when:

1. Acceptance criteria 1–7 are met, and `docs/traceability.md` maps each one to its code and tests.
2. The tests in `tests/draftPlan.test.ts` were written from the matrix before `src/ai/`, and `npm test` and `npm run typecheck` are green.
3. Input is validated (provider output through zod and `buildPlan`), failures fall back with a Norwegian notice, and no key or secret is added.
4. The form notice and the flash notice match the existing look, are readable at 360 px, and the notice is announced like other flashes.
5. No dead code: `templatePlan`'s Epic 2 comment is updated, and no unused provider code is left for 2.2.
6. README «Kjente begrensninger» and `docs/traceability.md` are updated; any change from this spec is explained in Spec Change Log; `sprint-status.yaml` is set to `done`.
7. The work is on a story branch with small commits (tests, `ai/`, `createEvent` and routes, docs), merged through a pull request that says how it was tested and which faults were found in AI-generated code; each corrected, rejected or clarified AI suggestion is logged in `docs/ki-logg.md`; `npm run lint` passes before each commit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

- Suggested notices: mock — «Planen er en testplan fra malen, fordi ingen AI-nøkkel er satt opp.» Fallback — «AI-utkastet kunne ikke brukes, så planen er malens standardplan.» Form — «Når du oppretter arrangementet, sendes beskrivelsen (hva, hvor, antall gjester, hva må gjøres og annen informasjon) til en AI-tjeneste som lager et utkast til plan. Navn og e-post til hjelperne sendes aldri.»
- Suggested description: one line per filled field, for example `Mal: Bryllup`, `Hva: …`, `Hvor: …`, `Antall gjester: 80`. Empty fields are left out.
- Timeout: `AbortController` plus a timer, cleared in `finally`; the test uses `vi.useFakeTimers()` and a provider that never settles.

## Verification

**Commands:**
- `npm test` -- expected: all green, including `tests/draftPlan.test.ts`
- `npm run typecheck` -- expected: no errors
- `npm run lint` -- expected: no findings

**Manual checks:**
- `npm run dev`, create an event: the form shows the AI notice; after creating, the event page shows the test-plan notice and the template's tasks, all unassigned.
