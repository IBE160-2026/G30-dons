---
title: 'Story 1.3: Add helpers, assign tasks and copy links'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '2dca73379b2c84f555d752077ca212d507400c85'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The organizer has a task list, but nobody to give it to. She needs to add her helpers to an event, give each task to one of them and share each helper's personal link in a chat.

**Approach:** Add helpers (unique per organizer and email, each with one link token) linked to events through `event_helpers`, at most five per event. Assigning and reassigning go through the first piece of the AD-2 state machine (`tasks.apply` + `domain/taskRules`). The event page lists the helpers with a **Kopier lenke** button (`public/copy.js`) and a read-only link field.

## Boundaries & Constraints

**Always:**
- One new migration (AD-14) adds `helpers` (`id`, `organizer_id` FK, `email`, `name` nullable, `link_token` unique, `created_at`; unique `(organizer_id, email)`), `event_helpers` (`event_id` FK ON DELETE CASCADE, `helper_id` FK, `created_at`; primary key `(event_id, helper_id)`), and nullable `tasks.helper_id` (FK helpers), `tasks.assigned_at`, `tasks.accepted_at`. Earlier migrations are never edited.
- Emails trimmed and lowercased before every lookup and insert. Tokens: `randomBytes(24).toString('base64url')`. Helper rows are never deleted.
- `services/helpers` owns `helpers` and `event_helpers`. The five-per-event check and the insert run in one transaction.
- `services/tasks` stays the only writer of `tasks`. Assign/reassign go through `tasks.apply(db, actor, taskId, command, now)`, which asks the pure `domain/taskRules.transition(task, command, actor, eventHelperIds, now)`. Assign: Unassigned → Open, `helper_id`, `assigned_at = now`. Reassign (any status except Unassigned) → Open, new `helper_id`, `assigned_at = now`, `accepted_at = null`. The target must be in `event_helpers` for the task's event.
- Every query scoped by the session `organizerId`. Another organizer's event, task or helper id gets the Norwegian 404 page and changes nothing (FR-2).
- The helper link is `absoluteUrl(config.appBaseUrl, paths.helperPage(token))` with `paths.helperPage = /h/:token`. The page itself comes in 1.4.
- PRG: success redirects with a flash. Form validation errors re-render with 422 and keep the input. A `DomainError` from a rule (limit, not linked) redirects with a flash. Norwegian text; no inline JS; error codes in `domain/errors.ts`.

**Never:** the helper page `/h/:token`, helper answers, `messages` or `changed_since_answer` (1.4); summaries and counts (1.5); emailing links (4.1); correcting or removing helpers, or unassigning (4.3); undo/reopen buttons (4.4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add helper | ` Ola@Example.no `, name "Ola" | helper `ola@example.no` created with a 32-char base64url token, linked to the event | N/A |
| Same email, other event | helper already on event 1, added to event 2 | same helper row and token, now linked to both | N/A |
| Same email, same event | helper already linked | nothing changes | flash "already added" |
| Sixth helper | event has 5 helpers | not added | flash with the Norwegian limit error |
| Bad email / name too long | `abc`, empty, name > 100 | not added | 422, field error, input kept |
| Assign | Unassigned task, linked helper | Open, `helper_id`, `assigned_at = now` | N/A |
| Reassign | task Open for A, choose B | Open for B, new `assigned_at`, `accepted_at = null`; `listForHelper(A)` no longer returns it | N/A |
| Same helper chosen | task already with A, choose A | nothing changes | N/A |
| Helper not on event | own helper linked only to another event | nothing changes | flash with the Norwegian error |
| Another organizer | A posts B's event, task or helper id to add/assign | nothing changes | 404 |
| Helper display | helper with/without name | shows name, else email | N/A |

</frozen-after-approval>

## Code Map

Reuse the 1.1/1.2 scaffold; don't restructure it.

- `src/db/schema.ts` -- add `helpers`, `eventHelpers`, and the three task columns; then `npm run db:generate -- --name helpers` → `src/db/migrations/0002_helpers.sql`. Never touch `0000`/`0001`.
- `src/services/tasks.ts` -- `getTask(db, organizerId, eventId, taskId)` (scoped lookup), `createPlanTasks`, `listForEvent`. Add `apply` and `listForHelper` here; keep add/update/delete as they are.
- `src/services/events.ts` -- `getEvent` throws `not_found` across organizers; reuse for event scoping.
- `src/domain/errors.ts` -- `DomainError`, `ERROR_TEXTS`; add codes. `email_in_use` belongs to organizers; don't reuse it here.
- `src/routes/organizer/events.ts` -- `renderEvent`, `idParam`, `fieldErrors`, `FIELD_OF`, `text`; the add-task route is the pattern for the add-helper route (422 re-render via `renderEvent`). `eventRoutes(db, clock, templates)` gains `config` to build links; update the call in `src/app.ts`.
- `src/routes/paths.ts` -- `absoluteUrl` already exists; add `helpers(eventId)`, `assignTask(eventId, taskId)`, `helperPage(token)`.
- `src/views/event.ejs` -- add a Hjelpere section and an assign control per task. Load `<script src="/copy.js" defer>` on this page only. helmet's default CSP already allows same-origin scripts.
- `tests/helpers.ts` -- `setupTestApp()`, `FIXED_NOW`; `tests/events.test.ts` shows the logged-in agent pattern.

## Tasks & Acceptance

**Execution:**
- [x] `src/db/schema.ts` + migration `0002_helpers` -- tables and columns above -- AD-5, AD-12, AD-14
- [x] `src/domain/taskRules.ts` -- pure `transition` for organizer `assign`/`reassign`: returns field changes, `noop`, or a refusal code; no imports outside `domain/` -- AD-2
- [x] `src/services/helpers.ts` -- `addHelperToEvent(db, clock, organizerId, eventId, { email, name }, newToken = randomToken)` (the token seam is for seeding in 1.6), `listForEvent(db, organizerId, eventId)`, `getHelper(db, organizerId, helperId)` (throws `not_found`), `eventHelperIds(db, eventId)`, `displayName(helper)` -- FR-8, AD-5
- [x] `src/services/tasks.ts` -- `apply(db, actor, taskId, command, now)` in one transaction; `listForHelper(db, helperId)` (non-Unassigned tasks, by deadline) -- FR-9, FR-11, AD-2
- [x] `src/domain/errors.ts` -- `helper_limit`, `helper_already_on_event`, `helper_not_in_event`, `email_invalid`
- [x] `src/routes/paths.ts`, `src/routes/organizer/events.ts`, `src/app.ts` -- `POST /events/:id/helpers` (zod: email ≤ 254, name ≤ 100, optional) and `POST /events/:id/tasks/:taskId/assign` (`helperId` must be a canonical id, otherwise 404). The route picks `assign` or `reassign` from the task's current status.
- [x] `src/views/event.ejs`, `public/copy.js`, `public/styles.css` -- helper list (display name, read-only link input, **Kopier lenke** button with `data-copy` pointing at the input); add-helper form hidden once five are linked; per task: status label, assigned helper's name, a `<select>` of the event's helpers and a **Tildel** button (only when the event has helpers)
- [x] `tests/helpers.test.ts`, `tests/taskRules.test.ts` -- every matrix row; the limit at 5 and 6; the token format `/^[A-Za-z0-9_-]{32}$/` and uniqueness; the link uses `APP_BASE_URL`; `copy.js` is served and the page has no inline `<script>` body

**Acceptance Criteria:**
- Given `npm test`, then all tests pass, and `npm run typecheck` is clean.
- Given the event page in a browser, when **Kopier lenke** is clicked, then the full helper link is on the clipboard and the button briefly says "Kopiert!". Without clipboard access, the read-only field gets selected instead.

## Implementation Notes

- Implemented by a subagent, interrupted once by an auto-mode outage and resumed with its context.
- Migration `0002_helpers.sql`. `taskRules.ts` declares its own `TaskStatus` union because `domain/` may not import `db/schema.ts`.
- Extra error code `action_not_allowed` for a mismatched move (assign on an assigned task, reassign on an Unassigned one, a helper actor). The route derives the action from the current status, so only a race reaches it.
- The assign route makes three service calls (`getTask`, `getHelper`, `apply`): the first two give the 404s for another event's task and another organizer's helper.
- Import cycle `services/tasks` → `services/helpers` → `services/events` → `services/tasks`; harmless (functions are only called at runtime).
- Verified: `npm test` 143/143 (9 files); `npm run typecheck` clean. The copy-to-clipboard browser check is manual and was not run.

## Spec Change Log

## Review Triage Log

Review pass 1 (blind, edge-case, verification-gap layers).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | Unassigned task's select preselects the first helper; one click on Tildel assigns her (blind, edge) | low | No placeholder option in `event.ejs`; happens in everyday use | patch: disabled "Velg hjelper" placeholder + `required` |
| 2 | Invalid helper form at five helpers (stale tab) renders 422 with no form or error (edge) | low | Form is hidden when `helpers.length >= maxHelpers`, errors included | patch: show the form when it has errors |
| 3 | `listForHelper` ordering untested: template ids already rise with deadline (verification) | medium | Dropping `orderBy` keeps the test green | patch: test with a higher-id, earlier-deadline task |
| 4 | Assigned helper's name in the task meta line not asserted (verification) | medium | "Anne" also appears in list, flash and option | patch: assert `· Anne` after the status span |
| 5 | No-op assign flash not asserted (verification) | low | Test checks only 302 and unchanged row | patch: follow redirect, assert "allerede tildelt" |
| 6 | Header of `services/tasks` claims every function is organizer-scoped; `listForHelper` is not (blind) | low | Helper scoping by token is AD-5 by design; the comment is what is wrong | patch: comment |
| 7 | `STATUS_LABELS` not tied to the status type (blind) | low | A new status would render `undefined` without a compile error; `taskRules` duplicate is caught by the compiler when a task row is passed in | patch: `satisfies Record<TaskStatus, string>` |
| 8 | "Kopiert!" not announced to screen readers (blind) | low | Text change in a button without `aria-live` | patch: `aria-live="polite"` |
| 9 | Concurrent double-submit / sixth add can hit UNIQUE or PK constraint → 500, or pass the count check (blind, edge) | maybe-false | Depends on whether drizzle's libsql transaction takes a write lock (`BEGIN IMMEDIATE`) and on libsql's connection handling; settle with a parallel-request test | defer (unverified medium) |
| 10 | Copy behaviour checked only by source-text asserts (verification) | medium | No DOM test environment; AC needs the manual browser check | defer |
| 11 | Assign route picks assign/reassign from a read outside `apply`'s transaction (blind, edge) | low | Only two simultaneous assigns on one task reach it, and they get a flash, not corruption; fix changes the command API | rejected |
| 12 | Same helper re-chosen for a declined/cant_do task is a no-op (blind, edge) | low | Recorded decision in Design Notes, approved; declined states arrive in 1.4, reopen in 4.4 (FR-31); fix edits this spec | rejected |
| 13 | Done task can be reassigned and reset to Open (blind, edge) | false | AD-2 table: reassign allowed from any status except Unassigned | rejected |
| 14 | No way to unassign (blind) | false | AD-2 has no organizer unassign; tasks go back to Unassigned only when a helper is removed (4.3) | rejected |
| 15 | Token collision not retried (blind, edge) | false | 192 random bits; the seam is used only with fixed distinct seed tokens | rejected |
| 16 | No index on `tasks.helper_id` / `event_helpers.helper_id` (blind) | low | Course-scale data, as Story 1.2 #16 | rejected |
| 17 | Copied links give 404 today (blind) | false | Spec: `/h/:token` page comes in 1.4; nothing is deployed before 1.7 | rejected |
| 18 | Missing `helperId` returns `helper_not_in_event` (blind) | false | Unreachable: the route turns a missing or non-canonical id into 404 before `apply` | rejected |
| 19 | `switch` in `transition` lacks a default (edge) | false | `TaskAction` is a closed union and the only caller passes a literal | rejected |
| 20 | Declined/cant_do have no status styling (blind) | low | Those states cannot occur until 1.4 | rejected |
| 21 | Copy fallback only selects the field, no hint (blind) | low | Selected text is the documented AD-16 fallback | rejected |
| 22 | Test gaps: concurrency, declined reassign, missing task id (blind) | low | Concurrency is #9; declined is #12; missing task id hits the same `getTask` 404 path already tested for another event's task | rejected |

## Design Notes

Decisions within scope, recorded here so they can be changed at approval:
- Re-adding an existing helper's email keeps her stored name. A name typed now only fills a name that was empty. Renaming comes with FR-30.
- Choosing the helper a task already has is a no-op (AD-2 "no double taps"), even for a task that is not Open.
- Copying has no server route: a helper's link appears only on the pages of events she is linked to, which are 404 for other organizers. That covers the "copy B's link" case of FR-2.
- Status labels: `unassigned` "Ikke tildelt", `open` "Venter på svar", `accepted` "Akseptert", `declined` "Avslått", `done` "Ferdig", `cant_do` "Kan ikke gjøres". Only the first two can occur in this story.

`copy.js` shape: on a click on `[data-copy]`, find the input by id, `navigator.clipboard.writeText(value)`, then set the button text to "Kopiert!" for 2 s. On a rejected promise or no clipboard API, `input.select()`.

## Verification

**Commands:**
- `npm test` -- expected: all green
- `npm run typecheck` -- expected: no errors

**Manual checks (if no CLI):**
- `npm run dev`: add two helpers, assign a task, reassign it, and click **Kopier lenke**, then paste the link.
