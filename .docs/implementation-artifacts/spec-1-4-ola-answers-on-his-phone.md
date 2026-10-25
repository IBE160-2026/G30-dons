---
title: 'Story 1.4: Ola answers on his phone'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '094c752d70ce5fce091305336aa61971c633dd84'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Helpers have links that lead nowhere. Ola needs to open his link on his phone, with no account, and say yes or no to each task, then report it done or not doable. The organizer must see the answers, be able to mark a task done herself, and Ola must be told when an accepted task changes.

**Approach:** Add the helper page `GET /h/:token` and one helper POST per task, both going through `tasks.apply` with a helper actor. `domain/taskRules` gains the helper moves and `allowedHelperActions`, and every helper command writes one `messages` row. The organizer gets a **Marker som ferdig** button, and editing an Accepted task sets `changed_since_answer`.

## Boundaries & Constraints

**Always:**
- One new migration (AD-14): table `messages` (`id`, `task_id` FK tasks ON DELETE CASCADE, `helper_id` FK helpers, `action`, `status_after`, `body` nullable, `created_at`, `seen_at` nullable), and `tasks.changed_since_answer` (integer boolean, NOT NULL DEFAULT 0, so existing rows migrate). Earlier migrations are never edited.
- Helper moves in this story (AD-2): Open + yes → Accepted (`accepted_at = now`); Open + no → Declined; Accepted + done → Done; Accepted + cantDo → Can't be done. Organizer markDone: any status → Done. A helper command is refused unless the actor is the task's current helper (`tasks.helper_id`) and the move is allowed. A command whose target status equals the current status is a no-op without a message, and writes only the message row with one.
- Every helper command that does something writes exactly one `messages` row (`seen_at = null`) in the same transaction and clears `changed_since_answer`. Organizer commands write none. `services/tasks` remains the only writer of `tasks` and `messages`.
- `updateTask` on an Accepted task whose title or deadline actually changes sets `changed_since_answer = true` and keeps the status (AD-13).
- Helper requests are scoped only by the token (never the session). A token not matching `/^[A-Za-z0-9_-]{32}$/` or not found gives the generic invalid-link page with 404, revealing nothing. GET never writes.
- Every `/h/` response sends `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer` and generic Open Graph tags (no names, events or tasks). The page `<title>` is generic too.
- Helper page: own layout without organizer header; works at 360 px with no sideways scroll; buttons at least 44 px high; Norwegian; no inline JS.

**Never:** the reminder link `?view=accepted` and reminders (Epic 3); the Messages panel, New-reply counts and summaries (1.5); changing an answer (Accepted ↔ Declined), Done ↔ Can't be done switch, or reopen (4.4); emailing links (4.1); client-side scripts on the helper page.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open page | valid token; his tasks in two events, plus an Unassigned task and a task reassigned away from him | header "Kari har invitert deg til å organisere Bryllup og Utdrikningslag"; only his non-Unassigned tasks, grouped by event, by deadline | N/A |
| Bad token | random 32 chars, `abc`, changed one char | invalid-link page, 404, no names | N/A |
| GET changes nothing | any helper GET | all rows identical before and after | N/A |
| Yes / No | Open task, Ja or Nei, with/without message | Accepted with `accepted_at` / Declined; one message row with `status_after` and body (or null) | N/A |
| Repeat answer | Accepted task, Ja again, no message | nothing changes, no message row | N/A |
| Repeat with message | Accepted task, Ja again, message "Kommer kl. 18" | status unchanged; one message row | N/A |
| Done / Can't do | Accepted task, Ferdig or Kan ikke gjøres, optional message | Done / Can't be done; one message row | N/A |
| Move not allowed | Open task + done; Declined task + yes | nothing changes | redirect with the refused notice |
| Not his task | another helper's task id, a reassigned-away task, a task id that doesn't exist | nothing changes | redirect with the refused notice |
| Message too long | body > 500 chars | nothing changes | redirect with a Norwegian notice |
| Organizer marks Done | any status, or already Done | Done (no-op if Done); no message row | another organizer's task → 404 |
| Accepted task edited | organizer changes title or deadline | status kept, flag set; helper card shows "Endret etter at du svarte"; next helper command clears it | N/A |

</frozen-after-approval>

## Code Map

Reuse the 1.1–1.3 scaffold; don't restructure it.

- `src/db/schema.ts` -- add `messages` and `tasks.changedSinceAnswer`; `npm run db:generate -- --name messages` → `0003_messages.sql`.
- `src/domain/taskRules.ts` -- `transition(task, command, actor, eventHelperIds, now)` returns `change | noop | refused`; organizer assign/reassign exist. Extend `TaskAction` with `yes | no | done | cantDo | markDone`, add an optional message write to the `change` result (or a separate `messageOnly` kind), and add `allowedHelperActions(task)`. Keep its local `TaskStatus` (domain may not import `db/`). The existing reassign/no-op tests must still pass.
- `src/services/tasks.ts` -- `apply(db, actor, taskId, command, now)` already scopes by `actor.organizerId` and writes inside one transaction; add the message insert and the flag clearing there. `listForHelper(db, helperId)` already excludes Unassigned and sorts by deadline. `updateTask` gets the AD-13 flag.
- `src/services/helpers.ts` -- add `findByToken(db, token)` and a `helperPage(db, token)` read model (helper, organizer name, events with their tasks) so the route makes one service call.
- `src/routes/organizer/events.ts` -- the assign route is the pattern for `POST /events/:id/tasks/:taskId/done`; `STATUS_LABELS` already exists.
- `src/routes/paths.ts` -- `helperPage(token)` exists; add `helperTask(token, taskId)` and `markDone(eventId, taskId)`.
- `src/app.ts` -- mount a new `src/routes/helper.ts` router; it must not use `requireLogin`.
- `src/views/partials/top.ejs` -- organizer layout; the helper page needs its own `partials/helper-top.ejs`.
- `tests/helpers.test.ts` -- `loggedIn`, `createEvent`, `addHelper` patterns; `FIXED_NOW` from `tests/helpers.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/db/schema.ts` + migration `0003_messages` -- AD-2, AD-12, AD-13, AD-14
- [x] `src/domain/taskRules.ts` -- helper moves, markDone, same-status rule, `allowedHelperActions` (open → yes, no; accepted → done, cantDo; others → none) -- AD-2
- [x] `src/services/tasks.ts` -- `apply` writes one message per acting helper command and clears the flag; `updateTask` sets the flag -- FR-7, FR-13, FR-15, FR-16
- [x] `src/services/helpers.ts` -- `findByToken`, `helperPage` -- FR-12
- [x] `src/domain/errors.ts` -- codes for a refused helper command and a too-long message
- [x] `src/routes/helper.ts`, `src/routes/paths.ts`, `src/app.ts` -- `GET /h/:token`, `POST /h/:token/tasks/:taskId` (`action` from the allowed list, `message` ≤ 500 chars), AD-6 headers on every `/h/` response -- FR-12, AD-6
- [x] `src/routes/organizer/events.ts`, `src/views/event.ejs` -- **Marker som ferdig** per task that is not Done -- FR-16
- [x] `src/views/helper.ejs`, `src/views/helper-invalid.ejs`, `src/views/partials/helper-top.ejs`, `public/styles.css` -- mobile-first page per Design Notes
- [x] `tests/helperPage.test.ts`, `tests/taskRules.test.ts` -- every matrix row; message count per command; headers and OG tags on valid and invalid pages; no organizer or task names on the invalid page; a 360 px check by asserting the viewport meta and that the helper styles set no fixed widths above 360 px

**Acceptance Criteria:**
- Given `npm test`, then all tests pass, and `npm run typecheck` is clean.
- Given Ola's page in a 360 px wide browser, then nothing scrolls sideways and every button is at least 44 px high.

## Implementation Notes

- Implemented by a subagent from the spec. Migration `0003_messages.sql` (drizzle emits `DEFAULT false`, which SQLite stores as 0).
- The helper router is mounted before cookie-session, so helper requests never read or set the session cookie (tested).
- `applyAsHelper(db, token, taskId, command, now)` keeps the helper POST at one service call; `apply` writes the message row and clears `changed_since_answer` for acting helper commands.
- Extra notice `?feil=lang` for a message over 500 characters. A repeat with nothing to save still redirects with `?lagret=1`.
- With no tasks, the header falls back to the events the helper is linked to, then to "‹Organizer› har invitert deg som hjelper".
- A 500 under `/h/` renders the organizer error layout (no names shown).
- Verified: `npm test` 191/191 (10 files); `npm run typecheck` clean. The 360 px browser check is manual and was not run.

## Spec Change Log

## Review Triage Log

Review pass 1 (blind, edge-case, verification-gap layers).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | Reassign keeps `changed_since_answer`; the new helper sees "Endret etter at du svarte" (all three) | medium | Reassign changes omit the flag; `apply` clears it only for helper actors | patch: clear on assign/reassign; tests |
| 2 | Organizer markDone keeps the flag; a Done task has no buttons, so the banner never clears (blind, edge, verification) | medium | `markDone` changes are `{ status: 'done' }` only | patch: clear on markDone; test |
| 3 | Header names only events holding the helper's tasks (blind, edge) | low | Fallback to `event_helpers` runs only with zero tasks | patch: linked events plus task events, date order; tests |
| 4 | No test for a helper with no tasks (header fallback, empty state) (verification) | medium | Every helper GET in tests uses Ola after `scenario()` assigns him tasks | patch: tests with #3 |
| 5 | Body-parser 413/400 on `/h/` POST skips the AD-6 headers (edge) | low | `express.urlencoded` runs before the helper router's header middleware | patch: set `/h` headers before the parser; test |
| 6 | CRLF from the textarea can push a 500-char message over the server limit (edge) | low | Browsers submit line breaks as CRLF; zod counts both characters | patch: normalise CRLF before the limit; test |
| 7 | Error notices use `role="status"` and success styling (blind) | low | `helper.ejs` renders every notice the same way | patch: `role="alert"` and error class |
| 8 | A repeat answer without a message (no-op) leaves the flag set (blind, edge) | low | Only reachable from a stale page (Accepted cards have no Ja button); AD-2 makes the repeat a no-op | rejected |
| 9 | Same-status message accepted on Declined/Done/Can't-be-done tasks (blind, edge) | false | Frozen matrix row "Repeat with message": status unchanged, one message row; a stale double tap lands here by design | rejected |
| 10 | Refused notice text misleading for a missing task id or a bad action (blind) | low | Only hand-made requests reach it; frozen matrix gives them the refused notice | rejected |
| 11 | Typed message lost after a refusal (blind) | low | Rare race; keeping it needs state across the redirect | rejected |
| 12 | 500-char limit enforced only in the route (blind) | low | No other caller writes messages | rejected |
| 13 | No indexes on `messages`; `helper_id` FK has no delete action (blind) | low | Course-scale data, as Story 1.2 #16; helpers are never deleted (AD-5) | rejected |
| 14 | Hard-coded badge colour (blind) | low | No theming in v1 | rejected |
| 15 | "Marker som ferdig" next to "Slett", no confirmation; allowed on Unassigned (blind) | low | FR-16 and AD-2: organizer markDone from any status | rejected |
| 16 | Diff leaves out the migration journal and snapshot (blind) | false | Deliberately left out of the review diff; `_journal.json` registers `0003_messages`, and the tests run every migration | rejected |
| 17 | taskId beyond `MAX_SAFE_INTEGER` maps to a different task (edge) | false | A rounded 17-digit number can't equal an existing small integer id | rejected |
| 18 | Duplicate `message` fields are dropped silently (edge) | low | Only hand-made requests send an array | rejected |
| 19 | `listForHelper` no longer used in `src/`; `helperPage` repeats its rule (verification) | low | Both filter non-Unassigned by helper and sort by deadline; covered by tests on both | rejected |
| 20 | No HTTP test for markDone on Unassigned or Can't be done (blind) | low | `taskRules` unit tests cover markDone from every status; the route is the same for all | rejected |

## Design Notes

Decisions within scope, recorded so they can be changed at approval:
- **Notices without a session:** a helper POST redirects to `/h/:token?lagret=1` ("Takk! Svaret ditt er lagret.") or `?feil=1` ("Oppgaven er endret siden du åpnet siden. Se oppdatert status under."). This keeps helper requests off the session cookie (AD-5); the query string only picks a fixed text and changes nothing.
- A refused helper POST redirects with the notice rather than a 404, so a helper whose task was reassigned gets an explanation. An invalid token on a POST gets the invalid-link page.
- Helper card status texts: open "Venter på svaret ditt", accepted "Du har sagt ja", declined "Du har sagt nei", done "Ferdig", cant_do "Kan ikke gjøres". Cards without allowed actions show the status only.
- Card text "‹Organizer› vil at du skal ‹task› innen ‹date›" uses `formatDate`. The header lists the events in date order joined with ", " and " og ".
- The message box is an optional `<textarea>` (500 chars) inside each card's form, sent with whichever button is tapped.
- Organizer answers are not shown on the event page beyond the status label; messages appear in the Messages panel (1.5).
- Seed tokens in 1.6 must match the 32-char token format, or the helper route treats them as invalid.

## Verification

**Commands:**
- `npm test` -- expected: all green
- `npm run typecheck` -- expected: no errors

**Manual checks (if no CLI):**
- `npm run dev`: assign a task, open the helper link in a 360 px device view, answer Ja then Ferdig with a message, then mark another task Done as organizer and edit an Accepted task to see "Endret etter at du svarte".
