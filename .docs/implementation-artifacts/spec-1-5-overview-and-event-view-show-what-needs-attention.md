---
title: 'Story 1.5: Overview and event view show what needs attention'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '24ca2d684c00f3186f6d203bc335c23089c706c9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kari can see each task's status, but nothing tells her which event needs her or which tasks are stuck, and helpers' replies are stored but invisible. Without that, a task can be forgotten without anyone noticing.

**Approach:** Add a pure `domain/status.ts` that derives Urgent, Needs a helper, On track, the Done count, days to the event and the next deadline from `(tasks, event, today)`. Use it for one summary per event on the overview and four panels on the event view (Done, To do, Timeline, Messages). The Messages panel opens with a real request that lists the replies and marks only those rows seen.

## Boundaries & Constraints

**Always:**
- Derived states come only from `domain/status.ts` functions taking `(tasks, event, today)` (AD-3); never stored, never computed in views or routes. `domain/` stays pure and uses only `domain/dates.ts` for date maths (AD-4).
- Rules (AD-3, FR-21): **Needs a helper** = Unassigned, Declined or Can't be done; or Open with `daysBetween(osloDate(assigned_at), today) ≥ 7`; or Open with deadline ≤ `today + 3` (past deadlines included). **Urgent** = Accepted with deadline ≤ `today + 3`. **On track** = no Urgent and no Needs a helper. Events whose date is before today count neither. **Done** = "N av M ferdig", M = all the event's tasks. **Next deadline** = earliest deadline ≥ today among tasks that are not Done.
- New reply = `messages` row with `seen_at = null` (AD-15). `GET /events/:id?panel=messages` lists the event's replies and sets `seen_at = now` only on rows it returned; it is the one organizer GET that writes. No other request marks replies seen.
- Every query scoped by the session `organizerId`; another organizer's event (with or without `?panel=messages`) is 404 and marks nothing.
- No stored state, no real-time push: every page load recomputes against `clock.today()` (FR-22). Norwegian text; no inline JS.

**Never:** seed data and fixture counts (1.6); reminders (Epic 3); editing or deleting events (Epic 4); client-side scripts or auto-refresh; marking replies seen on any other page.

## I/O & Edge-Case Matrix

| Scenario | Input / State (today = 2026-11-01) | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open, assigned 6 vs 7 days ago | `assigned_at` 2026-10-26 vs 2026-10-25 (Oslo), deadline far | 6 days: not Needs a helper; 7 days: Needs a helper | N/A |
| Open/Accepted, 4 vs 3 days left | deadline 2026-11-05 vs 2026-11-04 | 4: neither; 3: Open → Needs a helper, Accepted → Urgent | N/A |
| Deadline today vs yesterday | Accepted, 2026-11-01 vs 2026-10-31 | both Urgent; yesterday not used as next deadline | N/A |
| Unassigned / Declined / Can't do | any deadline | Needs a helper; event not On track | N/A |
| Done task | overdue deadline | neither; counts in N | N/A |
| Oslo day boundary | `assigned_at` 2026-10-25T22:30Z (Oslo 10-25 23:30) vs 23:30Z (Oslo 10-26) | 7 days vs 6 days | N/A |
| Past event | event date 2026-10-31 with Unassigned tasks | no Urgent, no Needs a helper; overview shows "Arrangementet er over" | N/A |
| Overview | two events, one clean, one with an Urgent task | "I rute" / "1 haster · N trenger hjelper" | N/A |
| Event panels | event with tasks in every status | Done "N av M ferdig"; To do counts + listed tasks; Timeline days and next deadline; Messages count | N/A |
| Messages panel | 2 unseen, 1 seen reply | 3 listed, newest first, the 2 marked "Ny"; afterwards all 3 seen and count 0 | N/A |
| Seen only on the panel | plain `GET /events/:id`, overview, helper page | `seen_at` stays null | N/A |
| Another organizer | B requests A's `/events/:id?panel=messages` | 404 | nothing marked |
| Reload after an answer | helper answers, organizer reloads | new status and counts shown | N/A |

</frozen-after-approval>

## Code Map

Reuse the 1.1–1.4 scaffold; don't restructure it.

- `src/domain/dates.ts` -- `osloDate`, `daysBetween`, `addDays`, `formatDateNb`; add `formatDateTimeNb(ts)` (Oslo time, `nb-NO`) for message times. No `new Date()` outside `clock.ts`, except inside `dates.ts` conversions as now.
- `src/domain/taskRules.ts` -- has its own `TaskStatus`; `status.ts` reuses it (domain may not import `db/`).
- `src/db/schema.ts` -- `messages` (with `seen_at`), `tasks.assignedAt`; no schema change, so no migration.
- `src/services/tasks.ts` -- `listForEvent` already loads an event's tasks sorted by deadline; the only writer of `messages` rows except `seen_at` (AD-15 exception).
- `src/services/events.ts` -- `listEvents`, `getEvent` (throws `not_found` across organizers).
- `src/services/helpers.ts` -- `displayName(helper)` for reply authors.
- `src/routes/organizer/overview.ts`, `src/views/overview.ejs` -- list of events; add the summaries.
- `src/routes/organizer/events.ts` -- `renderEvent` already loads event, tabs, tasks and helpers; add the summary and messages; `STATUS_LABELS` exists. `GET /events/:id` reads `?panel=messages`.
- `src/views/event.ejs`, `public/styles.css` -- `.event-layout` grid (left info + helpers, right tasks); panels go at the top of the right column.
- `tests/helperPage.test.ts` -- `scenario()`, `assign`, helper POST patterns to create real messages.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/status.ts` -- `needsHelper(task, today)`, `urgent(task, today)`, `eventSummary(tasks, event, today)` → `{ done, total, urgent[], needsHelper[], onTrack, past, daysToEvent, nextDeadline }` -- AD-3, FR-21
- [x] `src/domain/dates.ts` -- `formatDateTimeNb`
- [x] `src/services/messages.ts` -- `countNew(db, organizerId, eventId)`, `listAndMarkSeen(db, organizerId, eventId, now)` (newest first, at most 50 rows, marks only those returned, in one transaction; returns each row with helper display name, task title, action, status, body, created_at and whether it was new) -- AD-15
- [x] `src/services/summaries.ts` -- `overviewSummaries(db, organizerId, today)` and `eventSummary(db, organizerId, eventId, today)` through `domain/status.ts` -- FR-19, FR-20
- [x] `src/routes/organizer/overview.ts`, `src/views/overview.ejs` -- one summary per event -- FR-19
- [x] `src/routes/organizer/events.ts`, `src/views/event.ejs`, `public/styles.css` -- four panels per Design Notes; `?panel=messages` calls `listAndMarkSeen` -- FR-20, AD-15
- [x] `tests/status.test.ts`, `tests/summaries.test.ts` -- every matrix row; rule boundaries as pure unit tests with fixed `today`; panel and overview through HTTP; seen marking only on the panel

**Acceptance Criteria:**
- Given `npm test`, then all tests pass, and `npm run typecheck` is clean.
- Given the event view without `?panel=messages`, when it is loaded twice, then the New-reply count is the same both times.

## Implementation Notes

- Singular forms are used where Norwegian needs them: "1 nytt svar", "Om 1 dag", "Var for 1 dag siden"; plural otherwise as in Design Notes.
- Wording lives in `routes/organizer/summaryText.ts` (text only; every state and count comes from `domain/status.ts`).
- `onTrack` is false for a past event (it counts neither); the overview shows "Arrangementet er over" and the To do line says the same.
- On `?panel=messages` the route calls `listAndMarkSeen` first, then renders; the panel header counts the listed replies that were new. `listAndMarkSeen` lists unseen replies first, so repeated openings clear more than 50. The link reads "Vis svar" when there are no new replies.
- Overview: upcoming events soonest first, then past events most recent first. The service is `loadEventSummary` (not to be confused with `domain/status.eventSummary`).
- The Done panel body is a short note only; Design Notes require no list there.

## Spec Change Log

## Review Triage Log

Review pass 1 (blind, edge-case, verification-gap layers).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | With more than 50 unseen replies, the older ones are never listed, so the count never reaches 0 (blind) | medium | `listAndMarkSeen` always takes the newest 50; the existing test asserted the stuck state | patch: unseen first, then seen, newest first; test repeated openings |
| 2 | Open Messages panel shows "0 nye svar" above "Ny" badges; closed panel shows "0 nye svar" and "Vis svar (0 nye)" (blind) | low | `countNew` runs after marking; no zero case in the link text | patch: header uses the listed new count; "Vis svar" at zero |
| 3 | Past events sort above upcoming ones on the overview (blind, edge) | low | `listEvents` orders by date ascending | patch: upcoming by date, then past events newest first; test |
| 4 | Two exported `eventSummary` functions with different signatures (blind) | low | Service imports the domain one as `summarize` | patch: rename the service function `loadEventSummary` |
| 5 | `<progress>` has no accessible name (blind) | low | Inside `<summary>` with no label | patch: `aria-label` |
| 6 | `toContain('Ferdig')` always passes; cantDo reply label untested (blind, verification) | medium | Panel title and "N av M ferdig" contain it | patch: assert reply-action text per action, add cantDo |
| 7 | Overview reply counts tested with one event only; badge absence at zero not asserted (verification) | medium | Dropping `groupBy` or the `> 0` guard keeps tests green | patch: two-event test; absence asserts |
| 8 | Event view loads event and tasks twice; panels and list could be different snapshots (blind, edge) | low | Extra indexed reads; a mismatch needs an answer landing between two queries in one request | rejected |
| 9 | Seen marks committed before rendering; no `no-store`; prefetch could mark (blind) | low | AD-15 prescribes marking in the GET; browsers don't prefetch plain links without hints | rejected |
| 10 | Done and Timeline panels add little when expanded (blind) | low | Spec defines their one-line summaries only | rejected |
| 11 | `summaryText.ts` has no unit tests (blind) | low | Every branch is asserted through the rendered HTML | rejected |
| 12 | Hard-coded colour on `.attention-on-track` (blind) | low | No theming in v1 | rejected |
| 13 | Spec and sprint status not in the review diff (blind) | false | Deliberately left out of the review diff | rejected |
| 14 | Open task with `assigned_at` null never needs a helper (edge) | false | Every move to Open sets `assigned_at` (AD-2) | rejected |
| 15 | Unparseable timestamps crash `osloDate` / `formatDateTimeNb` (edge) | false | Timestamps are written only from `clock.now()` | rejected |
| 16 | Past event's Timeline still shows a future next deadline (edge) | low | Frozen rule defines next deadline without a past-event exception | rejected |
| 17 | Routes compute `todoOpen` and the overview state (edge) | false | They read `summary` fields (counts, `past`, `onTrack`); no rule is re-derived | rejected |

## Design Notes

Decisions within scope, recorded so they can be changed at approval:
- **Panels** are `<details>` elements (no JS), each `<summary>` showing its one-line summary: Done "N av M ferdig" with a `<progress>` bar; To do "N haster · M trenger hjelper" (or "Ingenting haster"); Timeline "Om N dager" / "I dag" / "Var for N dager siden", plus "Neste frist: ‹date›" or "Ingen flere frister"; Messages "N nye svar". To do is open by default when it has tasks; the others start closed.
- **Messages panel** cannot toggle open with `<details>`, because opening it must be a real request: its summary is a link "Vis svar (N nye)" to `?panel=messages`, and that response renders the panel open with the list. Each reply shows helper name, task title, action label ("Sa ja", "Sa nei", "Ferdig", "Kan ikke gjøres"), message text and time; new ones get a "Ny" badge.
- **To do** lists Urgent tasks and Needs-a-helper tasks in two short lists with deadline and helper name; the full editable task list stays below the panels.
- **Overview** row per event: name, date, then "I rute", or "N haster · M trenger hjelper" (zero parts omitted), or "Arrangementet er over" for a past event; plus "N nye svar" when there are New replies.
- At most 50 replies are listed; older unseen ones stay unseen until shown (AD-15 "only rows shown").
- `services/messages` setting `seen_at` is the AD-15 exception to "only `services/tasks` writes messages".

## Verification

**Commands:**
- `npm test` -- expected: all green
- `npm run typecheck` -- expected: no errors

**Manual checks (if no CLI):**
- `npm run dev`: two events, answer tasks from a helper link, reload the overview and event view, open "Vis svar" and reload to see the count drop to 0.
