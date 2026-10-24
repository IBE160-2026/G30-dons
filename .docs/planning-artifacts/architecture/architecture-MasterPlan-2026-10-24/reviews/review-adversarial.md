---
review: adversarial
target: ARCHITECTURE-SPINE.md (MasterPlan v1, draft 2026-10-24)
context: prd-MasterPlan-2026-10-19/prd.md
lens: "Construct two units one level down that each obey every AD to the letter yet still build incompatibly."
date: 2026-10-24
---

# Adversarial Review: Architecture Spine, MasterPlan v1

## Verdict

The spine settles the hard behavior well: one task state machine, derived statuses, computed reminders, one AI boundary and one mail boundary. What it leaves open is the data that separately built stories must share (Message, outbox row, template file, seed rows, timestamps) and the plumbing between them (actor and scoping, migrations, routes, notices and errors, test-mode tokens). Two agents can follow every AD to the letter and still produce code that does not fit together. **9 High, 10 Medium and 5 Low holes.** The High ones need closing before parallel story work starts.

Severity scale:
- **High:** stories will almost certainly diverge, and the merge breaks a Must FR or the fixture and test contract.
- **Medium:** likely to diverge, and the fix is local but costly once both sides exist.
- **Low:** an annoyance or polish issue, cheap to fix later.

Unit names below are the likely stories: *helper page*, *event view*, *reminders*, *seed*, *test inbox*, *test controls*, *plan draft*, *helpers & assignment*, *auth/app shell*, *tests*.

---

## H1 — Who creates Message rows, and what a Message is · High

**Units:** helper page (calls the service) vs task state machine / messages service.

**Divergence:** AD-2 says "every helper action and answer change creates a Message row". It does not say who creates the row, or what columns it has.
- Story A (helper page) calls `tasks.apply(...)` and then `messages.create(...)`, which is two service calls. Story B builds `tasks.apply` to insert the Message itself. Merged, every answer creates two rows, so New reply counts double.
- Only `task_id`, author `helper_id` and `seen_at` are known (from the memlog). The event view story wants to list "Ola sa ja: ‹text›" and needs the action. The messages story stores only `body`, and leaves the row empty when the helper writes nothing. The event view then cannot say what happened.
- The helper page story may add a "send message only" button, which changes no status. AD-2 has no action for that. Story A adds `comment` to the state machine, Story B rejects it.

**Proposed AD (tighten AD-2, add to Structural Seed):**
> **AD-2a — Messages.** `services/tasks.apply` is the only writer of `messages`. It inserts exactly one row per successful helper action, in the same transaction as the status change. Organizer actions create no Message. Columns: `id`, `task_id` (FK, cascade), `helper_id` (FK), `action` (`yes|no|done|cant_do|switch`), `status_after` (task status value), `body` (text, nullable, trimmed, max 1000 chars, empty → null), `created_at` (ISO UTC), `seen_at` (ISO UTC, nullable). There is no message-only action in v1. A message is always attached to an answer.

---

## H2 — When a New reply counts as seen · High

**Units:** event view vs messages panel.

**Divergence:** the PRD says a reply is seen "once she opens the Messages panel of that event". The panels are collapsible, and nothing in the spine says what "opens" means on the server.
- Story A sets `seen_at` on `GET /events/:id`, because the panel is always rendered. After the first load, the count is always 0, and the "2 new replies" summary never shows on the second load.
- Story B adds a POST fired by client-side JS when the panel expands. That breaks the "no JS except copy-link" stance, and a GET that writes breaks "one service call per request".
- Neither story handles a reply that arrives between rendering the page and marking replies seen, so it gets marked seen without ever being shown.

**Proposed AD:**
> **AD-14 — Seen replies.** The Messages panel is opened through its own link, `GET /events/:id?panel=messages`, which renders the event view with that panel expanded. That route calls `messages.listAndMarkSeen(organizerId, eventId, now)`, one service call. It returns the unseen rows and then sets `seen_at = now` only on the row ids it returned. A plain `GET /events/:id` never writes. The New reply count is `count(messages where seen_at is null)` for the event's tasks, computed in `domain/status.ts`.

---

## H3 — Assigning a helper who is not linked to the event · High

**Units:** helpers & assignment (the `event_helpers` side) vs event view task editor (the `tasks.helper_id` side).

**Divergence:** AD-2 lets `assign` set `helper_id` and AD-5 caps `event_helpers` at five. No AD ties the two together.
- Story A's assign dropdown lists every helper the organizer has, because helpers are unique per organizer. This is AD-compliant, and it silently bypasses the five-helper cap. A helper with tasks may then be missing from the event's helper list.
- Story B's "remove helper from event" finds tasks by `event_helpers`. A helper assigned without a link can never be removed. Under the FK they stay assigned.
- The helper page header ("…invited you to organize Wedding and Bachelorette party") is built from `event_helpers` in one story and from the helper's tasks in another. A helper who is linked but has no tasks then sees different headers.

**Proposed AD (tighten AD-5 and AD-2):**
> `assign` and `reassign` are refused with `DomainError('helper_not_on_event')` unless `(event_id, helper_id)` exists in `event_helpers`. `domain/taskRules.transition` receives `eventHelperIds` as input. The helper page header lists the events in `event_helpers` for that helper that have at least one task visible to the helper (see H16).

---

## H4 — Actor, scoping and the `apply` signature on helper-side and cron writes · High

**Units:** helper page POST vs organizer task actions vs reminders run.

**Divergence:** AD-5 says every query is "scoped by the logged-in `organizer_id`". Helper routes and the cron route have no logged-in organizer.
- Story A builds `services/*` to always take `organizerId` from the session. The helper route then cannot call `tasks.apply`.
- Story B passes `null` and skips scoping, which opens a cross-organizer write path.
- The signature `apply(taskId, action, actor)` has nowhere to put the assign target `helperId` or the message `body`. Each story adds its own fourth argument.
- An organizer's session cookie is also present when she uses "View as helper". A helper route that reads `req.session` acts as the wrong principal.

**Proposed AD (replace the AD-2 signature, tighten AD-5):**
> `tasks.apply(actor, taskId, command, now)`, where `actor` is `{ kind: 'organizer', organizerId }` or `{ kind: 'helper', helperId, organizerId }`. `command` is a discriminated union, for example `{ type: 'assign', helperId }` or `{ type: 'yes', body? }`. Helper routes resolve `token → helper` first and build a helper actor whose `organizerId` comes from the helper row. They never read `req.session`. Every service query filters by `actor.organizerId`. `reminders.run(today, now)` is the only cross-organizer service. It is called only from `routes/internal.ts` and `routes/testMode.ts`.

---

## H5 — Timestamps vs calendar days, and the missing `clock.now()` · High

**Units:** `domain/status.ts` (7-day Needs a helper) vs `domain/reminderDue.ts` (14 days after a yes) vs seed.

**Divergence:** `assigned_at` and `accepted_at` are UTC ISO timestamps. "Days since assignment" are compared "as Oslo calendar days", but `domain/` is pure and gets only `today`.
- Story A slices the UTC string, `assigned_at.slice(0, 10)`. Story B converts it to an Oslo date. They give different answers between 22:00 and 24:00 UTC, so a task can be in Needs a helper in the overview and not in a reminder test.
- `clock.ts` defines only `today()`. `assigned_at = now` needs an instant, so a story calls `new Date()` in a service. That breaks the rule that nothing else calls `new Date()`, and tests with a fixed date get real timestamps.
- The seed writes `assigned_at` as `today − 8` at an unspecified time of day, or with the SQL default `CURRENT_TIMESTAMP` (`YYYY-MM-DD HH:MM:SS`, not ISO). That breaks string comparison and the uniqueness of `(task_id, accepted_at)`.

**Proposed AD (extend AD-4):**
> `clock.ts` exposes `today(): 'YYYY-MM-DD'` (Oslo) and `now(): string` (ISO UTC from `Date.prototype.toISOString`). Both can be replaced in tests by one `setClock(fixedInstant)`. `domain/dates.ts` holds the only conversion, `osloDate(iso) → 'YYYY-MM-DD'`, and `daysBetween(a, b)`. Status and reminder rules call only these. "Assigned 7 or more days ago" means `daysBetween(osloDate(assigned_at), today) >= 7`. The application writes every timestamp column. No SQL defaults. The seed builds timestamps with `dates.atOsloNoon(date)`.

---

## H6 — How the seed writes rows, and which field combinations are legal per status · High

**Units:** seed vs task state machine and status rules.

**Divergence:** AD-1 says only `services/` writes, and AD-2 says nothing but `apply` writes `status`. AD-11 says the seed "builds tasks in every status", but not how.
- Story A (seed) inserts rows directly through Drizzle, because services stamp `now` and cannot backdate. It creates `accepted` rows with `accepted_at = null`, `declined` rows that keep `helper_id = null`, or `done` rows without a helper. The domain trusts its inputs, so counts come out wrong without any error.
- Story B (seed) replays `tasks.apply` with a moving fake clock. Both are compliant readings, and they give different fixtures.
- No AD says whether the seed creates Message rows (unseen ones for the "New replies" count) or `reminders_sent` rows.

**Proposed AD (tighten AD-11, add an invariant table to AD-2):**
> The seed builds state only by calling services with a replaceable clock that it moves backwards for each step. It never inserts `tasks` or `messages` directly. It may insert organizer, event and helper rows through their services. Allowed field combinations per status: `unassigned` → `helper_id`, `assigned_at` and `accepted_at` all null. `open` → `helper_id` and `assigned_at` set, `accepted_at` null. `accepted` → all three set. `declined` → `helper_id` and `assigned_at` set, `accepted_at` null. `done` or `cant_do` → `helper_id` may be null only if marked done by the organizer from Unassigned. `domain/taskRules.assertInvariant(task)` checks these combinations, and the seed test runs it on every row.

---

## H7 — Seeded helper links vs random tokens · High

**Units:** seed (AD-6: tokens are 24 random bytes) vs README and docs (FR-25: "README lists the seeded helper links") vs test controls (FR-26: "seeded helper links listed") vs tests.

**Divergence:** if the seed draws random tokens, the links the README story writes are dead after the next `npm run seed`. The docs story hard-codes links instead, and the seed story ignores them.
- The test-controls story has no way to tell a seeded helper from one the examiner added. One story adds an `is_seeded` column, another lists all helpers.
- The tests need tokens. One story queries by email, another parses outbox bodies.

**Proposed AD (tighten AD-6 and AD-11):**
> Production tokens come from `crypto.randomBytes(24).toString('base64url')`, in `services/helpers` only. The seed passes fixed tokens: 32-character base64url constants exported from `seed/fixture.ts` as `SEEDED_HELPERS = [{ key, email, name, token }]`. The README shows them as `${APP_BASE_URL}/h/<token>`. `seed(db, today)` returns `{ organizerId, helpers: Record<key, {id, token}>, tasks: Record<key, id> }`. Tests use only that return value. The test-mode page lists every helper of the logged-in organizer with **View as helper**. "Seeded links" means those same rows. No `is_seeded` column.

---

## H8 — Migrations ownership and database bootstrap · High

**Units:** any two stories that change `db/schema.ts` (plan draft adds `tasks`, messages adds `messages`, test inbox adds `outbox_emails`) vs seed vs tests vs README Quick Start.

**Divergence:**
- Two stories built in parallel each run `drizzle-kit generate`. Both produce `0003_*.sql` and conflicting `meta/_journal.json` entries. Both are compliant, and the merge breaks.
- The Quick Start (addendum) is `npm install → cp .env → npm run seed → npm run dev`. There is no migrate step. Story A puts the migration in the seed, Story B runs it at server start, and the tests story uses `drizzle-kit push`. They give three schemas that can drift.
- AD-11 does not say whether running `npm run seed` twice wipes the database, fails on the unique email, or adds duplicates.

**Proposed AD:**
> **AD-15 — Schema and migrations.** `db/schema.ts` is the single schema source. Each story that changes it creates exactly one migration, with `drizzle-kit generate --name <story-key>`, after rebasing on main. Committed migrations are never edited. `db/migrate.ts` exports `migrate(db)` (drizzle migrator). `server.ts`, `seed()` and the test setup all call it first. `push` is never used. `npm run seed` deletes the test organizer by email, and everything cascades from that row, then rebuilds it. Other organizers' data is left alone. Tests use `DATABASE_URL=file:./data/test-<worker>.db`, deleted before each run.

---

## H9 — Template file shape vs plan shape · Medium

**Units:** plan draft (`ai/`, `domain/plan.ts`) vs event creation form vs mock.

**Divergence:**
- `templates/wedding.json` is "default plans as offsets". Story A writes a bare array `[{title, daysBeforeEvent}]`. Story B writes `{ key, name, fields, defaultPlan }`, because FR-3 needs template input fields and the default event name.
- `draftPlan({ template, … })` receives a key string in one story and the loaded object in another.
- The sign of `daysBeforeEvent` is not fixed. One reading takes 0 as the event day and positive numbers as earlier dates. Another allows negatives for "after". AD-8 then rejects them, or they slip through as dates before the event.
- The mock in `mock.ts` returns one plan or one per template.
- The event stores `template` as `'wedding'` or as `'Bryllup'`.

**Proposed AD (tighten AD-8):**
> Template files have the shape `{ key: 'wedding'|'bachelorette', name: string (Norwegian default event name), defaultPlan: Array<{ title: string, daysBeforeEvent: integer >= 0 }> }`, validated by `ai/schema.ts` `TemplateSchema` at startup. `daysBeforeEvent = 0` is the event day. `draftPlan` takes the template key. `events.template` stores the key. The mock returns one fixed plan per key. Event form fields are the same for both templates and are columns on `events`: `name`, `what`, `location`, `event_date`, `guest_count`, `todo_text`, `other_info`.

---

## H10 — Two owners of task-row creation, and the AI call inside a transaction · Medium

**Units:** plan draft (`services/plans` inserts the drafted tasks) vs task editing (`services/tasks` adds and deletes tasks) vs event creation (`services/events`).

**Divergence:** AD-2 covers status changes only. Insert, delete and title or deadline edits have no owner.
- Story A inserts drafted tasks in `plans`. Story B inserts manual tasks in `tasks` with different defaults (status null vs `'unassigned'`, `changed_since_answer` null vs false).
- "Multi-row changes in one transaction" tempts an agent to wrap event creation, the AI call (up to 30 s) and the task inserts in one Turso transaction.

**Proposed AD:**
> `services/tasks` is the only module that inserts, updates or deletes `tasks` rows. `create` always sets `status='unassigned'` and `changed_since_answer=false`. Field edits go through `tasks.edit`, which applies AD-13. `events.create` gets the validated plan from `plans.draft()` **before** opening a transaction. It then inserts the event and calls `tasks.createMany(tx, …)` inside that one transaction. Services may call other services' functions that take a `tx`. Routes still make exactly one service call.

---

## H11 — `mail/send` message shape, the outbox row and transactions · High

**Units:** reminders vs share-link email (FR-10) vs test inbox vs SMTP.

**Divergence:**
- `send(organizerId, message)` leaves `message` undefined. The reminder story sends `{to, subject, html}`. The link story sends `{to, subject, text}`. The test inbox renders `text` and shows reminders as blank. FR-24's "links" column gets parsed from HTML by one story and stored by another.
- The From name needs the organizer's name, but the dependency diagram allows `mail/` to use `config` only. Story A queries the database from `mail/`, which breaks the arrows. Story B makes the caller pass the name.
- AD-7 says `reminders_sent` is "written in the same transaction as the email is queued". `send` takes no transaction handle, so the outbox insert runs outside it. With SMTP there is no queue at all. A send that succeeds followed by a failed commit gives a duplicate reminder, and the reverse order gives a lost one.

**Proposed AD (tighten AD-9 and AD-7):**
> `mail/send(tx, { organizer: {id, name, email}, to, subject, text, links: string[], kind: 'reminder'|'helper_link' })`. The body is plain text only, in v1. In test mode, `send` inserts into `outbox_emails(id, organizer_id, kind, to_email, subject, text, links_json, created_at)` using `tx`. With SMTP, `reminders.run` first inserts the `reminders_sent` row and commits it, then sends. A failed send deletes the row so that the next run retries. At-most-once wins over at-least-once. The caller loads the organizer row. `mail/` never touches `db/`.

---

## H12 — Where the "Simulate AI failure" toggle lives · Medium

**Units:** test controls vs `ai/draftPlan`.

**Divergence:** `draftPlan({template, eventDate, description})` has a fixed input, and `ai/` may depend only on `domain/` and `config`. Story A stores the toggle in `req.session` and has `ai/` read it, which breaks the boundary. Story B uses a module-level global, which leaks across organizers and test files. Story C adds a column on `organizers`.

**Proposed AD:**
> The toggle is stored in the organizer's session as `simulateAiFailure: boolean`, and only `routes/testMode.ts` sets it. The event-create route passes it as `plans.draft({ …, forceFailure })`. `ai/draftPlan` accepts `forceFailure?: boolean` and honors it only when `config.testMode`. The plan result always carries `source: 'ai'|'mock'|'fallback'` and `notice?: NoticeCode`.

---

## H13 — Error rendering and notices after a redirect · Medium

**Units:** helper page (AD-6: "returns an error page") vs organizer forms (Convention: "a Norwegian message on the same page") vs plan draft (fallback notice).

**Divergence:**
- AD-6 and the Errors convention contradict each other for helper POSTs. One story renders a separate error page, another re-renders the helper page with the message.
- The fallback and mock notices have to survive `POST /events → 302 → GET /events/:id`. Story A adds a `plan_source` column, Story B uses a session flash, and Story C passes `?notice=fallback`. All three fit the spine.
- HTTP status codes differ by story: 200, 400 or 409.
- Each story keeps its own map from code to text, so the same `DomainError` shows two different Norwegian texts.

**Proposed AD (replace the Errors convention):**
> All POSTs follow Post/Redirect/Get. A one-shot flash `{ kind: 'notice'|'error', code }` goes in `req.session.flash`, set by `res.flash(code)` and read and cleared by middleware into `res.locals`. Validation errors on organizer forms re-render the form with status 422 and the user's input kept. A `DomainError` on a helper POST redirects back to `/h/:token` with an error flash, and the page shows the task's current state. Unknown or invalid tokens get 404 with the generic page. `domain/errors.ts` holds the `ErrorCode` union, and `views/messages.ts` is the only map from code to Norwegian text.

---

## H14 — No route map, no single link builder · Medium

**Units:** reminders (builds the reminder link) vs share link vs test controls ("View as helper") vs helper page forms vs organizer views.

**Divergence:** only `/h/:token`, `?view=accepted` and `/internal/reminders/run` are fixed.
- Helper POST is `POST /h/:token/tasks/:id/answer` in one story and `POST /h/:token` with `taskId` in the body in another.
- The test inbox is at `/test/inbox`, `/test-inbox` or `/dev/outbox`.
- Each story joins `APP_BASE_URL + '/h/' + token` by hand, and stories disagree about trailing slashes.
- When test mode is off, the test routes return 404 in one story and 403 in another, or they are not mounted at all.

**Proposed AD:**
> `src/routes/paths.ts` is the only place route strings and absolute links are built: `paths.helper(token, {acceptedOnly})`, `paths.event(id)` and so on. It uses `config.appBaseUrl` with trailing slashes stripped. Routes: `/login`, `/logout`, `/signup`, `/` (overview), `/events/new`, `/events/:id`, `/events/:id/edit`, `/events/:id/tasks`, `/events/:id/tasks/:taskId/{edit,assign,done,reopen,delete}`, `/events/:id/helpers`, `/events/:id/helpers/:helperId/{edit,remove,send-link}`, `GET /h/:token`, `POST /h/:token/tasks/:taskId/:action`, `POST /internal/reminders/run`, `/test/{inbox,controls,reminders/run,ai-failure}`. `/test/*` is mounted only when `config.testMode`, so it returns 404 otherwise.

---

## H15 — The config list is closed but incomplete, and the cron route is open when its secret is missing · Medium (security)

**Units:** app shell / `server.ts` vs internal route vs deployment.

**Divergence:**
- AD-10 lists the settings and says `config.ts` is the only reader of `process.env`. `PORT`, which Render requires, is missing from the list. Story A reads `process.env.PORT` in `server.ts`, which breaks AD-10. Story B hard-codes 3000, which breaks on Render.
- With `TEST_MODE=true`, `CRON_SECRET` and `APP_BASE_URL` may be missing. The internal route compares `req.get('X-Cron-Secret') === config.cronSecret`. A missing header against a missing secret gives `undefined === undefined`, so anyone can run reminders.
- Missing `APP_BASE_URL` in test mode leads one story to fall back to `localhost:3000` and another to crash.

**Proposed AD (tighten AD-10):**
> Add `PORT` (default 3000). In test mode, `APP_BASE_URL` defaults to `http://localhost:${PORT}`. The internal route is mounted only when `config.cronSecret` is set, and compares with `crypto.timingSafeEqual`. `config` is a frozen object, and tests override it only through `createApp(configOverrides)`.

---

## H16 — Which tasks the helper page shows · Medium

**Units:** helper page vs reminder link view vs event deletion and past events.

**Divergence:**
- The spine fixes `?view=accepted` but not the default set. Story A shows Open and Accepted. Story B also shows Declined (needed for FR-14 change answer) and Done or Can't be done (needed for FR-31 switch).
- Tasks of past events stay on the page in one story and are hidden in another.
- Ordering, and grouping by event, also differ. The fixture's "seeded helper sees N tasks" assertions break.

**Proposed AD:**
> The helper page shows every task where `helper_id = helper.id`, in all statuses except `unassigned`, from all the organizer's events, past events included. It is grouped by event (event date ascending), then sorted by deadline ascending. `?view=accepted` shows only `accepted`, with Done and Can't-be-done buttons. The available buttons per task come from `domain/taskRules.allowedHelperActions(task)`, the same table `transition` uses.

---

## H17 — Removing a helper: Done tasks, the helper row, messages and FK enforcement · Medium

**Units:** helpers & assignment (FR-30) vs event deletion (FR-32) vs messages.

**Divergence:**
- AD-2 says `any assigned → Unassigned` on removal. Story A applies it to Done and Can't-be-done tasks too, so finished work reappears as Needs a helper. Story B keeps the finished tasks.
- AD-12 implies the Helper row is deleted when no event links it any more. `messages.helper_id` is an FK, so deleting the row either cascades and deletes that helper's messages, or the restrict rule makes the delete fail.
- AD-12's "Prevents" line names outbox rows, but its rule never covers them.
- SQLite enforces FKs only with `PRAGMA foreign_keys=ON`. One story's tests pass on a connection with it off.

**Proposed AD (tighten AD-2 and AD-12):**
> On removal, only `open`, `accepted` and `declined` tasks go to Unassigned. `done` and `cant_do` keep `helper_id`, so the history stays visible. Helper rows are never deleted in v1. Unlinking only removes the `event_helpers` row. The FKs are: `messages.task_id → tasks` cascade, `messages.helper_id → helpers` restrict, `reminders_sent.task_id` cascade, `tasks.event_id` cascade, `event_helpers` cascade on both sides. Outbox rows are kept, because they are a send log. `db/client.ts` runs `PRAGMA foreign_keys=ON` on every connection, and one test checks it.

---

## H18 — Helper email normalization, and correcting to an email that already exists · Medium

**Units:** helpers (add and correct) vs seed vs helper lookup.

**Divergence:**
- Uniqueness is on `(organizer_id, email)`. Story A lowercases and trims, the seed story does not. `Ola@x.no` and `ola@x.no` then become two helpers, which breaks FR-8's "same helper".
- Correcting A's email to B's existing email hits the unique constraint. One story merges the two helpers, another errors, and a third splits the event link.

**Proposed AD (tighten AD-5):**
> `domain/email.normalize(e)` (trim and lowercase) is applied in the zod schema at every boundary, the seed included. Correcting an email updates the Helper row in place, across all events, and issues a new token. If another helper of the same organizer already has that email, it fails with `DomainError('email_in_use')`. No merging in v1.

---

## H19 — An Open task past its deadline · Medium

**Units:** `domain/status.ts` vs fixture table and tests.

**Divergence:** the glossary defines "due within 3 days" as a deadline of today through today+3, which does not include past deadlines. An Open task assigned 2 days ago with yesterday's deadline is then in neither Urgent nor Needs a helper, and the event can still show On track. The status story implements `deadline <= today + 3`, which includes the past, while the fixture author follows the glossary literally. The counts disagree.

**Proposed AD (tighten AD-3):**
> In `needsHelper`, an Open task counts when `daysBetween(osloDate(assigned_at), today) >= 7` or `deadline <= today + 3`, past deadlines included. Record this as a deliberate reading of FR-21 and add it to the fixture with one seeded case.

---

## H20 — Repeated or same-state helper actions (double tap) · Low

**Units:** helper page vs state machine.

**Divergence:** a double tap on **Yes** sends a second `yes` on an Accepted task. The table has no such move, so one story shows an error. Another treats it as a no-op success but still inserts a second Message, which counts as a New reply.

**Proposed AD:**
> A command whose target status equals the current status, with an empty body, is a no-op: no write, no Message, and a redirect with no error. With a body, it is refused as `already_answered`.

---

## H21 — `changed_since_answer` is never reset · Low

**Units:** task editing (AD-13) vs helper page.

**Divergence:** only reassign or reopen clears the flag. When the helper answers again (Accepted → Declined → Accepted), one story clears it and another keeps showing "Endret etter at du svarte" forever. Editing a Declined task sets the flag in one story and not in another.

**Proposed AD (tighten AD-13):**
> The flag is set only by `tasks.edit` when the status is `accepted` and the title or deadline actually changes. It is cleared by any helper action on the task and by reassign or reopen.

---

## H22 — Fixture table format · Low

**Units:** seed and docs vs the test that "asserts the counts against" `docs/fixtures.md`.

**Divergence:** the docs story writes a free-form Markdown table, and the tests story parses a different column order. Or the tests story duplicates the numbers in code, which recreates the drift AD-11 is meant to prevent.

**Proposed AD (tighten AD-11):**
> `seed/fixture.ts` exports `EXPECTED_COUNTS` per event: tasks per status, urgent, needsHelper, done, M, unseen replies. `docs/fixtures.md` holds a table between `<!-- fixture:start -->` and `<!-- fixture:end -->` with fixed columns. One test parses that block and deep-equals it with `EXPECTED_COUNTS`, and a second test checks the seeded database against `EXPECTED_COUNTS`.

---

## H23 — Session cookie flags and CSRF · Low

**Units:** auth / app shell vs organizer forms.

**Divergence:** `cookie-session` sets no `sameSite` by default. One story leaves the defaults, another sets `sameSite:'strict'`. Strict breaks nothing in the organizer flow, but it does change how "View as helper" behaves when the tab is opened from email clients. Neither story adds CSRF protection, and a story that later adds a token middleware breaks every other story's forms.

**Proposed AD (add to the Auth convention):**
> `cookie-session` uses `{ httpOnly: true, sameSite: 'lax', secure: !config.testMode }`. Organizer POSTs rely on SameSite=Lax. No CSRF token in v1, recorded in Deferred.

---

## H24 — DomainError code registry · Low

**Units:** every story that throws errors.

**Divergence:** each story makes up its own codes (`not_allowed` vs `transition_not_allowed`), and they collide or duplicate. Covered by H13's `domain/errors.ts`. It is listed separately so that the epics step adds it to the first story's definition of done.

**Proposed AD:**
> The first story creates `domain/errors.ts` with the `ErrorCode` union, and `views/messages.ts` with the Norwegian text for each code. Later stories add codes there and nowhere else.

---

## Summary table

| # | Hole | Severity |
|---|---|---|
| H1 | Message creation owner and shape | High |
| H2 | When a New reply counts as seen | High |
| H3 | Assigning a helper not linked to the event | High |
| H4 | Actor, scoping and `apply` signature | High |
| H5 | Timestamps vs Oslo days, `clock.now()` | High |
| H6 | Seed write path and per-status invariants | High |
| H7 | Seeded helper tokens vs README and test controls | High |
| H8 | Migrations ownership and bootstrap | High |
| H9 | Template file shape and offset sign | Medium |
| H10 | Task-row creation owner, AI call outside transaction | Medium |
| H11 | Mail message shape, outbox row, transaction | High |
| H12 | Simulate-AI-failure toggle path | Medium |
| H13 | Error page contradiction and notices after redirect | Medium |
| H14 | Route map and link builder | Medium |
| H15 | Config gaps (PORT) and open cron route | Medium |
| H16 | Helper page visibility set | Medium |
| H17 | Helper removal, FK and cascade details | Medium |
| H18 | Email normalization and correction collision | Medium |
| H19 | Open task past its deadline | Medium |
| H20 | Double-tap and no-op actions | Low |
| H21 | `changed_since_answer` reset | Low |
| H22 | Fixture table format | Low |
| H23 | Cookie flags and CSRF | Low |
| H24 | DomainError code registry | Low |
