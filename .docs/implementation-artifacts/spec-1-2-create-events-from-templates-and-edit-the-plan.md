---
title: 'Story 1.2: Create events from templates and edit the plan'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_commit: '219f90580184f89cf93ed61e23d305a0847251e7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A logged-in organizer has nothing to plan with yet. She needs to create her wedding and bachelorette events and get a starting task list she can change, instead of a blank page.

**Approach:** Add events created from two fixed templates (Bryllup, Utdrikningslag). Each template's default plan becomes the event's tasks through one pure plan module, and the organizer can add, rename, re-date and delete tasks on the event's page. Each event gets its own tab.

**Decisions:**
- Only the event date is required. The name defaults to the template name; what, where, guest count, what needs to be done and other information are optional, and blanks show as "–".
- The spec is kept as one story (about 2,400 tokens, above the 1,600 target), because creating events and editing their tasks share the same pages and tables.
- The template task lists are the ones in Design Notes, as revised by the user on 2026-10-24.

## Boundaries & Constraints

**Always:**
- Tables `events` and `tasks` only, in one new migration (AD-14). `events`: `id`, `organizer_id` (FK organizers), `template_key`, `name`, `occasion`, `location`, `event_date` (YYYY-MM-DD), `guest_count` (nullable int), `todo`, `other_info`, `created_at`. `tasks`: `id`, `event_id` (FK events, ON DELETE CASCADE), `title`, `deadline` (YYYY-MM-DD), `status`, `created_at`. No SQL defaults on timestamps.
- Templates in `src/templates/wedding.json` and `bachelorette.json`, shape `{ key, name, defaultPlan: [{ title, daysBeforeEvent }] }`, validated by zod when the app is created: 1–40 tasks, titles 1–120 chars, `daysBeforeEvent` integer ≥ 0. An invalid file stops startup.
- `domain/plan.ts` is pure and is the one plan validator (AD-8): offsets become dates via `domain/dates.ts`, any date before today becomes today, and a plan is invalid if it has no tasks, more than 40, a title over 120 chars, or a deadline after the event date.
- `services/tasks` is the only writer of `tasks` rows, including creating the plan's tasks (AD-2). The event and its tasks are created in one transaction. Every new task is `unassigned`.
- Every event and task query is scoped by the session's `organizerId`. Another organizer's event or task id, in a GET or a POST, gets the Norwegian 404 page and changes nothing (FR-2).
- Event date is required, a real date, and not before today (Oslo). Form errors re-render with HTTP 422 and keep the input. Successful posts redirect with a flash (PRG).
- Organizer URLs come from `routes/paths.ts`, using the spine's English resource paths: `/events/new`, `/events`, `/events/:id`, `/events/:id/tasks`, `/events/:id/tasks/:taskId`, `/events/:id/tasks/:taskId/delete`.
- Norwegian UI text; no inline JavaScript.

**Never:** AI, mock plans or `draftPlan` (Epic 2); helpers, assignment or statuses other than `unassigned` (1.3, 1.4); summary panels, counts or Urgent/Needs a helper (1.5); editing or deleting events (Epic 4); client-side scripts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create from template | template Bryllup, date 60 days ahead, other fields | event saved; one `unassigned` task per template entry, deadline = date − offset; redirect to its page | N/A |
| Name left empty | template Utdrikningslag, no name | event named "Utdrikningslag" | N/A |
| Deadline would be in the past | date 5 days ahead, entry with offset 30 | that task's deadline = today; event still created | N/A |
| No date / past date / bad date | missing, yesterday, `2026-02-30` | not created | 422, Norwegian field error, input kept |
| Unknown template | `template_key` not wedding/bachelorette | not created | 422 |
| Two events | organizer has two events | each event page shows a tab per event; the current one is marked | N/A |
| Add task | title + deadline | new `unassigned` task in the list | 422 on empty title, title > 120, invalid deadline |
| Edit task | new title and/or deadline | saved; list re-sorted by deadline | same as add |
| Delete task | delete button | task removed | N/A |
| Another organizer's ids | A requests B's `/events/:id`, or posts to B's task | Norwegian 404 | nothing changes |
| Invalid template file | template JSON breaks the schema | `createApp` throws | startup aborted |

</frozen-after-approval>

## Code Map

Story 1.1 laid the scaffold; reuse it, don't restructure it.

- `src/db/schema.ts` -- add `events` and `tasks`; keep `organizers` as is. Then `npm run db:generate -- --name events_and_tasks` adds `src/db/migrations/0001_*.sql`; never edit `0000_organizers.sql`.
- `src/domain/dates.ts` -- `addDays`, `isDate`, `daysBetween`; reuse, don't duplicate date maths.
- `src/domain/errors.ts` -- has `not_found`; add codes as needed (Norwegian text).
- `src/routes/middleware.ts` -- `requireLogin(db)`, `organizerOf(res)`, `setFlash`; use them on every new route.
- `src/routes/paths.ts` -- add the event and task paths.
- `src/app.ts` -- `createApp({ config, db, clock })`; mount new routers here and load templates here. A `DomainError('not_found')` must render the 404 page with status 404.
- `src/routes/organizer/overview.ts`, `src/views/overview.ejs` -- currently "Du har ingen arrangementer ennå."; list the organizer's events with links and a "Nytt arrangement" button. Summaries come in 1.5.
- `src/views/partials/top.ejs` -- header partial; tabs go in a new partial, not here.
- `tests/helpers.ts` -- `setupTestApp()`, `FIXED_NOW = 2026-11-01T10:00:00Z` (Oslo today 2026-11-01). Use agents for logged-in requests as in `tests/auth.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/db/schema.ts` + new migration -- events and tasks tables as above -- AD-12, AD-14
- [x] `src/templates/wedding.json`, `src/templates/bachelorette.json`, `src/templates/index.ts` -- the two templates (Design Notes) and `loadTemplates()` with zod -- AD-8
- [x] `src/domain/plan.ts` -- `buildPlan(entries, eventDate, today)` returning dated tasks or an invalid result with a reason -- FR-5, AD-8
- [x] `src/services/tasks.ts` -- `createPlanTasks(tx, eventId, tasks, now)`, `listForEvent`, `addTask`, `updateTask`, `deleteTask`, all scoped by organizer -- FR-7, AD-2
- [x] `src/services/plans.ts` -- `templatePlan(template, eventDate, today)` via `domain/plan.ts` (the seam Epic 2 replaces with `draftPlan`)
- [x] `src/services/events.ts` -- `createEvent` (validate date, plan, one transaction), `listEvents`, `getEvent` (throws `not_found` across organizers) -- FR-2, FR-3, FR-4
- [x] `src/routes/organizer/events.ts` -- new-event form, create, event page, task add/edit/delete; zod at the boundary -- AD-1
- [x] `src/views/event-new.ejs`, `src/views/event.ejs`, `src/views/partials/event-tabs.ejs`, overview update, styles -- Norwegian; tasks sorted by deadline, each editable in place with its own small form
- [x] `tests/plan.test.ts`, `tests/events.test.ts` -- every I/O matrix row, plan rules at each limit (0, 40, 41 tasks; 120/121 chars; deadline = event date vs one day after; offset clamped to today), FK enforcement (a task for a missing event is refused)

**Acceptance Criteria:**
- Given `npm test`, then the new and existing tests pass, and `npm run typecheck` is clean.
- Given an event page, then its tasks are listed by deadline with dates shown as `nb-NO` (for example "15. januar 2027").

## Implementation Notes

- Implemented directly in the planning session (no implementation subagent).
- Migration `0001_events_and_tasks.sql`; `tasks.status` uses the full status list from the spine as a text enum, but only `unassigned` is written in this story.
- `createApp` loads templates itself (`loadTemplates(templatesDir)`); the optional `templatesDir` lets tests point at a broken folder. `MAX_PLAN_TASKS` and `MAX_TITLE_LENGTH` live in `domain/plan.ts` and the template schema reuses them.
- Route patterns use `paths.event(':eventId')` and friends, so every URL shape still comes from `routes/paths.ts`.
- A `DomainError('not_found')` from any service renders the 404 page in the app's error handler. Ownership is checked before form validation on task edits, so another organizer's task is a 404, not a 422.
- Domain rules that need "today" (event date not in the past, changed deadline not in the past) live in the services; length and presence checks are zod at the route.
- `domain/dates.ts` gained `formatDateNb` (exposed to views as `formatDate`). `db/client.ts` gained the `Tx` type for `createPlanTasks`.
- Verified: `npm test` 90/90; `npm run typecheck` clean; `npm start` → register, create a Bryllup for 2027-06-12 → 23 tasks, first due "14. desember 2026", tab marked current, `/events/new` 200.

## Spec Change Log

## Review Triage Log

Review pass 1 (blind, edge-case, verification-gap layers).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | Invalid edit with a task id outside the event gives 422, not 404 (all three layers) | medium | Invalid branch only called `getEvent`; no row matched, so the 422 page showed no error | patch: `getTask` checked first; tests for another event's task and a missing id |
| 2 | Huge `daysBeforeEvent` throws RangeError in `addDays` (500) | low | `addDays` → `toISOString` throws past the Date range before the `isDate` guard | patch: `MAX_OFFSET_DAYS` 3650 in `buildPlan` and the template schema; tests |
| 3 | Guest count accepts `0x10`, `1e3` via `z.coerce` | low | `Number('0x10')` is 16 | patch: digits-only regex; tests for -3, 2.5, abc, 0x10, 1e3, 10001, 0, 10000 |
| 4 | Route ids accept `1e0`, `0x1`, `01` as aliases | low | `z.coerce.number()` accepted them | patch: canonical id regex; tests |
| 5 | Edit form lacks `novalidate`, so server errors never show on edit | low | Browser `required` blocked empty titles on edit only | patch |
| 6 | `?template=` preset on the new-event form is unused and untested | low | No link in `src/` uses it | patch: removed |
| 7 | Edit 422 not tested for long title, invalid or past deadline; input echo and error row not asserted | medium | Only empty title tested; values never checked | patch: `it.each` with value and row-position asserts |
| 8 | Add 422 does not assert the input is kept | medium | Only status and message checked | patch: echo assert |
| 9 | Manual deadline after the event date not pinned | medium | All tests used earlier deadlines | patch: add and edit test |
| 10 | Overview/tab order and links not asserted | low | Only names checked | patch: order and href asserts |
| 11 | Blank-field test passes on any en dash | low | `toContain('–')` | patch: asserts `<dd>–</dd>` per field |
| 12 | Foreign keys off on extra pooled connections | false | Verified in Story 1.1: libsql enables foreign keys by default on every connection; `tests/app.test.ts` checks a second connection during a transaction | rejected |
| 13 | Manual deadlines after the event should be refused | false | Design Notes allow them (returning rented items) | rejected |
| 14 | Template folders from tests never deleted | false | They live under `TEST_DB_DIR`, cleared by `tests/globalSetup.ts` each run | rejected |
| 15 | Refresh after a 422 offers to resubmit | false | AD-1 prescribes 422 re-render for validation errors | rejected |
| 16 | No index on `organizer_id` / `event_id` | low | Course-scale data | rejected |
| 17 | No CHECK constraint on `status` / `template_key` | low | Only services write these, through typed enums | rejected |
| 18 | Ownership queried two or three times per render | low | A few extra indexed lookups per page | rejected |
| 19 | Delete has no confirmation or undo | low | Frozen matrix: delete button → task removed | rejected |
| 20 | Clamped deadlines not announced | low | FR-5 clamps silently; no notice required | rejected |
| 21 | Errors not linked with `aria-describedby` | low | Same as Story 1.1 #26 | rejected |
| 22 | Event + tasks atomicity has no failure-path test | medium | Removing `db.transaction` breaks no test; needs a seam to force a mid-transaction failure | defer |
| 23 | Startup does not run templates through `buildPlan` | false | With the offset cap, every schema-valid template yields a valid plan (offsets ≥ 0, ≤ 40 tasks, titles ≤ 120) | rejected |

During the patch, a scripted edit dropped the backslashes from two regexes (`/^\d+$/`, `/^[1-9]\d*$/`); the new tests caught it, and both were fixed with the Edit tool before commit.

## Design Notes

**Templates** (title · days before the event), in this order in the JSON files.

Bryllup (23): Sette budsjett 180 · Planlegge og booke vielse 175 · Lage gjesteliste 170 · Bestille lokale 160 · Bestille fotograf 150 · Bestille musikk eller DJ 140 · Bestille save the date-kort 135 · Sende ut «save the date» 120 · Planlegge meny 110 · Bestille mat og drikke 100 · Kjøpe eller leie antrekk 90 · Sende invitasjoner 75 · Brudekjoleprøving 60 · Bestille blomster 60 · Smoking- eller dressprøving 45 · Bestille kake 45 · Planlegge bordplassering 21 · Kjøpe pynt 14 · Lage bordkort 10 · Lage program for dagen 10 · Bekrefte alle leverandører 7 · Hente antrekk 3 · Pynte lokalet 1.

Utdrikningslag (16): Avklare dato i hemmelighet 60 · Lage gjesteliste 50 · Sette budsjett per person 45 · Sende invitasjon 40 · Bestille lokale eller overnattingssted 35 · Bestemme program og aktiviteter 30 · Bestille aktivitet 25 · Bestille bord på restaurant 21 · Lage matplan 20 · Samle inn penger 14 · Bekrefte planen med partneren 14 · Kjøpe kostymer og rekvisitter 10 · Lage quiz og leker 7 · Ordne transport 5 · Innkjøp av mat og drikke 2 · Bekrefte tidsplanen med alle 1.

**Task deadlines when editing:** a deadline must be a real date. A changed deadline may not be before today; an unchanged one may (an old task can still be renamed). Deadlines after the event date are allowed for manual tasks (for example returning rented items).

**Form fields** map to columns: Navn → `name`, Hva → `occasion`, Hvor → `location`, Når → `event_date`, Antall gjester → `guest_count`, Hva må gjøres → `todo` (later sent to the AI), Annen informasjon → `other_info`. Text limits: name 100, occasion and location 200, todo and other info 2000; guest count 0–10000.

## Verification

**Commands:**
- `npm test` -- expected: all green
- `npm run typecheck` -- expected: no errors

**Manual checks (if no CLI):**
- `npm run dev`: create a Bryllup and an Utdrikningslag, switch tabs, add, rename, re-date and delete a task.
