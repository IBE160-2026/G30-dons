---
title: 'Rubric review — Architecture Spine, MasterPlan v1'
reviewed: ARCHITECTURE-SPINE.md (draft, 2026-10-24)
context: .memlog.md, prd-MasterPlan-2026-10-19/prd.md
date: 2026-10-24
reviewer: Claude (rubric lens)
---

# Rubric review — Architecture Spine, MasterPlan v1

## Verdict

This is a strong, focused spine that is right-sized for a beginner. The paradigm, the single state machine (AD-2), derived statuses (AD-3), the clock (AD-4), the reminders computed at check time (AD-7) and the AI/mail boundaries (AD-8/9) close most of the real divergence points, and every PRD FR/NFR maps to a home. It is **not ready to hand to epics yet**. One deployment choice probably cannot work as written (SMTP from Render free). The operational envelope is thin: migrations, how the app is deployed, what a failed email does, and test isolation from `.env` are undecided. Several Rules leave a gap that lets two stories diverge (`now()` vs `today()`, SQLite foreign keys, what clears `changed_since_answer`, the seen-marker for replies). All of these can be fixed with short edits. Over-engineering is low.

## Counts

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 5 |
| Medium | 12 |
| Low | 7 |
| **Total** | **25** |

## Checklist summary

| Check | Result |
|---|---|
| Fixes the real divergence points for epics/stories, misses none | Mostly. Missing: `now()` source, writer for task edits/`changed_since_answer`, seen-marking, simulate-failure state, styling, URL/POST conventions |
| Every AD Rule enforceable and prevents its divergence | Mostly. AD-4, AD-7, AD-12 have holes (F-4, F-3, F-5). AD-5 is a policy with no mechanism (F-9) |
| Nothing under Deferred lets two units diverge | No. Styling and htmx are deferred "per story" (F-14) |
| Named tech plausible/current | Yes, versions match the dated registry check in the memlog. Exception: Render free + SMTP (F-1). TS 7 with tsx needs a typecheck step (F-15) |
| Covers PRD capabilities | Yes. All FR-1..32 and NFR-1..9 are bound and mapped. Small gaps on FR-26 toggle and FR-20 "seen" (F-12, F-11) |
| Operational envelope (deploy/envs, migrations, secrets, ops/logging) | Weak. Deploy partly (F-1, F-8), migrations undecided (F-2), secrets partly (F-7), logging minimal (F-13) |
| Over-engineering for a beginner | Low. Small trims suggested (F-24, F-25) |

---

## Findings

### F-1 — Critical — Render free web services cannot send SMTP

- **Location:** Stack (Hosting row); AD-9; deployment diagram; NFR-8 mapping.
- **Problem:** Since late 2025, Render's free web services block outbound traffic on SMTP ports (25, 465, 587). Verify this on Render's free-tier docs page. If it is true, Nodemailer → Gmail SMTP from Render fails, and on the friends test there are no reminders (FR-17/18) and no emailed links (FR-10 email). The memlog's free-tier survey checked sleep and disk, but not outbound ports. The failure only shows up on deploy day, close to 14 Nov.
- **Fix:** Verify now. If it is blocked, choose one of these and record it in AD-9 and the Stack:
  - (a) An email provider with an **HTTPS API** and a free tier that works without your own domain. Check its sender-verification rules and its terms. Keep `mail/smtp.ts` → `mail/provider.ts` behind `mail/send`, so nothing else changes.
  - (b) Gmail API over HTTPS with OAuth. This is harder for a beginner.
  - (c) A host that allows SMTP.
  
  Add a "send one real email from the deployed app" smoke check to the deploy checklist (F-8).

### F-2 — High — Migrations: how and when they run is undecided

- **Location:** Structural Seed (`db/migrations/`); Stack (drizzle-kit); no AD covers it. The memlog says "drizzle-kit migrations committed", but the spine never states it.
- **Problem:** The spine doesn't say whether the schema is applied with `drizzle-kit push` or with generated migrations, who runs them (the developer, startup, or the Render build), or how tests and seed get the schema. Different stories will do different things. One agent runs `push` locally, another adds a migration, and Turso drifts. Tests built on a "fresh database file" need the same schema path, or tests and prod diverge.
- **Fix:** Add an AD or a convention:
  - Schema lives only in `db/schema.ts`. Every change ships with `drizzle-kit generate` output committed in `db/migrations/`. Never use `push`.
  - `src/db/migrate.ts` applies migrations with drizzle's libsql migrator. It runs (1) in `npm run setup`/`npm start` before listening, (2) in the Vitest global setup on each fresh test DB, and (3) inside `seed()`'s caller before seeding.
  - Migrations must be additive during the friends test.

### F-3 — High — Reminder "same transaction as the email is queued" is undefined in production; mail failure semantics missing

- **Location:** AD-7, AD-9.
- **Problem:** Only test mode has a queue (`outbox_emails`). In production, an SMTP send cannot join a DB transaction. The Rule doesn't say what happens in each failure case:
  - The `reminders_sent` row is written first and the send fails: the reminder is lost silently (at-most-once).
  - The send happens first and the insert fails: the reminder is sent twice.
  
  AD-9 claims to prevent "silent failures in production" but gives no rule for errors. Should `send` throw, return a result, or log? The FR-10 "send link by email" story and the reminders story will each invent their own handling.
- **Fix:** In AD-7: "Insert the `reminders_sent` row (unique key = the claim), then call `mail/send`. If the send fails, delete the row and log the error, so the next run retries." In AD-9: "`send` throws `MailError` on failure. Callers decide: reminders roll back their claim; the FR-10 'send link' route shows a Norwegian error. Every failed send is logged with task/helper ids, not the body." Also say how one run reports what it did, e.g. `{ due, sent, failed }` returned and logged.

### F-4 — High — AD-4 has no `now()`, so timestamps escape the fixed clock

- **Location:** AD-4; AD-2 side effects (`assigned_at = now`, `accepted_at = now`); AD-3 ("assigned 7 or more days ago"); AD-7 (`accepted_at + 14 days`).
- **Problem:** AD-4 only provides `clock.today()`. It forbids `new Date()` "for business logic", but the transitions must stamp `now`. Agents will call `new Date()` in `services/tasks`, or `transition()` will create the timestamp itself, which breaks the purity of `domain/`. Tests then mix a fixed "today" with real-time timestamps. "Assigned 7 days ago" and "14 days after the yes" become day-dependent, which is exactly the divergence AD-4 says it prevents. Converting a UTC timestamp to an Oslo calendar day also has no named owner.
- **Fix:** `clock.ts` exports `today(): 'YYYY-MM-DD'` (Oslo) and `now(): string` (ISO UTC). Both are replaced in tests. `transition()` receives `now` as an argument. Add one pure helper, `domain/dates.ts` `osloDay(isoTimestamp)` plus `addDays`/`daysBetween` on `YYYY-MM-DD` strings. All day arithmetic goes through it. The seed takes `(db, today, now)`, or derives `now` from `today`.

### F-5 — High — `ON DELETE CASCADE` silently does nothing unless SQLite foreign keys are on

- **Location:** AD-12; db/client.ts.
- **Problem:** SQLite enforces foreign keys only when `PRAGMA foreign_keys = ON` is set on each connection. Without it, task and event deletes leave orphan messages and `reminders_sent` rows, which AD-12 exists to prevent. The orphans still show up in "New replies" counts. The cascade looks correct in the schema and tests pass unless a test checks for orphans.
- **Fix:** AD-12 Rule: "`db/client.ts` runs `PRAGMA foreign_keys = ON` right after connecting (local file and Turso). A test deletes an event and asserts zero messages, `reminders_sent` and `event_helpers` rows remain." Also list every cascading FK: event→tasks, event→event_helpers, task→messages, task→reminders_sent. Add `messages.helper_id ON DELETE SET NULL` or `RESTRICT`, to match the "Helper kept while linked" rule (see F-17).

### F-6 — High — Tests can pick up a real API key or SMTP settings from `.env`

- **Location:** AD-8 ("With no `ANTHROPIC_API_KEY`, the mock is used"); AD-10 (settings independent); FR-27.
- **Problem:** Once the developer puts a real `ANTHROPIC_API_KEY` in `.env` (needed for the friends test), `npm test` reads it through `config.ts` and calls the paid API over the network. That breaks FR-27 (no network, no keys) and NFR-4. Tests also don't fix `TEST_MODE`. Because the settings are deliberately independent, nothing forces test mode on.
- **Fix:** AD-10 addition: "`config.ts` exports `loadConfig(env)`. The app passes `process.env` (after dotenv). The Vitest setup passes an explicit object (`TEST_MODE=true`, no AI key, `DATABASE_URL=file:` temp path) and never loads `.env`." Also: "`ai/` and `mail/` get their provider from config at call time, so tests can inject a failing mock (FR-6 mocked error)."

### F-7 — Medium — Secrets handling in deployment not stated

- **Location:** AD-10; Stack (Hosting).
- **Problem:** The spine names the secrets (`SESSION_SECRET`, `CRON_SECRET`, the AI key, SMTP password) but doesn't say where they live in production, that `.env` is gitignored, or how the default `SESSION_SECRET` from `.env.example` is kept out of production. A copied `.env.example` gives the deployed app a public session secret, which lets anyone forge an organizer login.
- **Fix:** Add to AD-10: "Production secrets are set only in Render's environment settings. `.env` is in `.gitignore`. With `TEST_MODE` off, the app refuses to start if `SESSION_SECRET` or `CRON_SECRET` is missing, shorter than 32 characters, or equal to the `.env.example` value. The Anthropic key lives only in Render and in the developer's local `.env`."

### F-8 — Medium — Deployment and environments are only a diagram

- **Location:** deployment flowchart; Stack.
- **Problem:** Nothing decides the Render build and start commands, the Node version pin, `tsx` being a runtime dependency (not a devDependency, since there is no build step), whether the deployed DB is seeded, or how the friends-test organizer account is made. The Turso connection also needs an auth token, and `DATABASE_URL` alone is listed (see F-10). Render free sleeps after 15 minutes, and a cron-job.org request that times out while the app wakes up can mean reminders never run.
- **Fix:** Add a short "Environments & deploy" convention:
  - `engines.node ">=22.12"`; `tsx` in dependencies.
  - Render build `npm ci`, start `npm start` (migrate, then serve).
  - Deployed DB is **not** seeded; real accounts sign up.
  - cron-job.org request timeout set to its maximum. If that is still shorter than the wake time, add a second job a few minutes earlier that does `GET /healthz` to wake the app.
  - `GET /healthz` returns 200 without touching the DB.
  - Deploy checklist: login, one AI draft, one real email, one cron run.

### F-9 — Medium — AD-5 scoping is a policy with no mechanism

- **Location:** AD-5.
- **Problem:** "Every query is scoped by `organizer_id`" can't be checked as written. Tasks, messages and event_helpers have no `organizer_id` column, so each story will invent its own join or check, and one will forget. FR-2 isolation bugs are the classic agent mistake.
- **Fix:** The Rule should name the mechanism:
  - Every organizer-facing service function takes `organizerId` as its first parameter.
  - Access to a task, message or helper goes through `services/access.ts` (`ownedEvent(orgId, eventId)`, `ownedTask(orgId, taskId)`), which throws `DomainError('not_found')`.
  - One test per organizer route requests organizer B's id as organizer A and expects a refusal.
  
  Also add "emails are trimmed and lower-cased before storing and lookup". Without that, `Ola@x.no` and `ola@x.no` become two helpers, and the seed and the add-helper form diverge.

### F-10 — Medium — Turso auth token missing from the config list

- **Location:** AD-10 setting list; Stack (@libsql/client).
- **Problem:** A remote Turso database needs an auth token. AD-10 says `config.ts` is the only reader of env and lists the full set of settings, which doesn't include it. The deploy story will either break that list or bury the token in the URL without anyone deciding it.
- **Fix:** Add `DATABASE_AUTH_TOKEN` (optional, required when `DATABASE_URL` starts with `libsql://`) to AD-10 and `.env.example`.

### F-11 — Medium — "Seen" marking for New replies is undecided and conflicts with the GET convention

- **Location:** AD-2 (Message rows); AD-6 ("GET never changes data"); Conventions (Writes); PRD Glossary "New reply … seen once she opens the Messages panel".
- **Problem:** The panels are collapsible, and the spine says no client JS beyond copy-link. So the event is not decided:
  - A GET that marks seen breaks the spirit of "GET never mutates" (link previews only matter for helper links, but an agent may apply the rule everywhere).
  - Opening the event view can't count as seen, because that defeats the count.
  - A POST needs a form or JS.
  
  Two stories (event view, messages panel) will diverge. It's also unclear whether Message rows with empty text, created for answer changes, appear in the list.
- **Fix:** Decide it. For example: "Messages panel is a `<details>` element. A 'Merk som lest' button (POST) sets `seen_at` for that event's messages", or "`GET /events/:id/messages` is its own page and marks seen on load (allowed for organizer routes)". Also state that a Message row with null text displays as the status change, e.g. "Ola sa ja".

### F-12 — Medium — Where the "Simulate AI failure" toggle lives is undecided

- **Location:** AD-8; AD-10; FR-26; routes/testMode.ts.
- **Problem:** The toggle could live in the session, in a DB row, or in process memory, and the AI story and the test-mode story will pick differently. Process memory leaks across organizers and tests. The AI module must not read sessions.
- **Fix:** "The toggle is stored in the organizer's session (`simulateAiFailure`). `services/plans` reads it and passes `{ forceFail: true }` to `ai/draftPlan`. It is ignored when `TEST_MODE` is off."

### F-13 — Medium — Logging and operations are minimal

- **Location:** Conventions (Errors: "logs to the console").
- **Problem:** On the friends test, the only way to diagnose "no reminder arrived" or "plan fell back" is Render's log view. Nothing says to log reminder runs, AI fallbacks and their reasons, or mail failures. Nothing says what must *not* be logged (helper emails, tokens, passwords, AI descriptions), and NFR-3 privacy depends on that.
- **Fix:** Convention: "One `log.ts` with `info`/`error` writing single-line JSON to stdout. Always log: startup config summary (mode, AI real/mock, mail provider; no secrets), each reminder run's counts, each AI fallback with its reason code, each mail failure. Never log tokens, passwords, email bodies, or AI prompts."

### F-14 — Medium — Deferred styling and htmx let stories diverge

- **Location:** Deferred (Page styling; htmx).
- **Problem:** "Decided in the UX step or per story" and "add per story" mean the first story may add a CDN CSS framework and htmx, while another hand-writes CSS. It also collides with helmet's CSP (F-16). Deferral is safe only when nothing can diverge, and here it can.
- **Fix:** Decide the base now: "One `public/styles.css`, no CSS framework. One EJS layout `views/layout.ejs` with header and partials. Mobile-first, 360px (NFR-1). No htmx in v1. Adding any client library is an architecture change, not a story choice." Leave only visual design to UX.

### F-15 — Medium — No typecheck step; tsx strips types

- **Location:** Stack (TypeScript 7.0.2 run with tsx); FR-27.
- **Problem:** tsx and Vitest strip types without checking them, so agent-written type errors pass `npm test`. TypeScript 7 is the native compiler. Also confirm drizzle-kit and the editor tooling work alongside it.
- **Fix:** Add `npm run check` = `tsc --noEmit` (strict) and run it in `npm test`'s pre-step, or as a required step before each commit. If TS 7 has problems with any tool, pin TypeScript 5.9.x instead. Either is fine for a beginner, but decide one.

### F-16 — Medium — helmet's default CSP blocks the inline copy-link script

- **Location:** memlog "helmet defaults" + "tiny inline JS only for copy-link"; FR-10 (Must); Structural Seed (no `public/`).
- **Problem:** helmet's default Content-Security-Policy forbids inline `<script>` and `onclick` handlers, so the Must copy-link button breaks with a console error. An agent will "fix" it by disabling CSP.
- **Fix:** "Client JS lives in `public/js/*.js`, served by `express.static`. No inline scripts or handlers. helmet's CSP stays at its defaults." Add `public/` to the Structural Seed.

### F-17 — Medium — Helper removal and deletion rules are incomplete

- **Location:** AD-12 ("The Helper row is kept while any other event still links to it"); AD-2 (helper removed).
- **Problem:** The Rule implies the Helper row is deleted when no event links to it, but doesn't say so. Messages carry `helper_id` as author, so a delete either fails or cascades the organizer's message history away. Also not covered:
  - Removing a helper from an event whose task is Done: does it become Unassigned and lose Done? AD-2 says "any assigned → Unassigned", which would turn Done work into Needs a helper.
  - Outbox rows (they are organizer-scoped, so only on account deletion, which doesn't exist).
- **Fix:** Decide:
  - "Helper rows are never deleted in v1." (Simplest.)
  - "Removal unassigns only tasks not Done or Can't be done in that event. Done tasks keep `helper_id`." (Or explicitly accept the PRD reading.)
  - Messages keep their author.

### F-18 — Medium — Writer and clearing rule for `changed_since_answer` unclear; task-edit owner ambiguous

- **Location:** AD-13; AD-2 (reassign clears it); Capability map (FR-7 → services/plans, tasks → services/tasks).
- **Problem:** Task create, edit and delete are mapped to `services/plans` while status changes go to `services/tasks`, so two services touch the task table. AD-13 doesn't say which one sets the flag. Only reassign or reopen clears it, so after the helper answers again (for example Accepted → Declined → Accepted) the page still says "Endret etter at du svarte" forever. "Open" is also missing from the AD-2 state table's write list for this flag.
- **Fix:** "`services/tasks` owns every write to the tasks table (create, edit, delete, status). `services/plans` only builds a plan and calls `tasks.createMany`. `changed_since_answer` is set by `tasks.edit` when status is Accepted and title or deadline changed. It is cleared by any helper action on that task and by assign, reassign and reopen."

### F-19 — Low — AD-7 boundary cases

- **Location:** AD-7.
- **Problem:** Two cases are open. (1) Is a yes given exactly on the `deadline − 3` day "after the 3-day point"? (2) Does a late catch-up send a reminder for a task whose deadline has already passed?
- **Fix:** State it: "Due day = min(osloDay(accepted_at)+14, deadline−3). No reminder if osloDay(accepted_at) > deadline−3. Send when today ≥ due day and today ≤ deadline." Add these as named test cases.

### F-20 — Low — Seed re-run behavior unspecified

- **Location:** AD-11.
- **Problem:** If `npm run seed` runs twice (a likely examiner action), it either crashes on the unique `(organizer_id, email)` constraint or duplicates events.
- **Fix:** "`npm run seed` wipes and recreates the local DB file (refuses when `DATABASE_URL` is not `file:` or `TEST_MODE` is off)."

### F-21 — Low — Fixture test parses Markdown

- **Location:** AD-11 ("one test asserts the counts against" `docs/fixtures.md`).
- **Problem:** Parsing a Markdown table in a test is fragile, and agents will reformat the table.
- **Fix:** `seed/expected.ts` exports the counts. The test asserts against it, and a second small test checks that `docs/fixtures.md` contains the same numbers. Alternatively, the docs table can be generated by a script.

### F-22 — Low — Route, form and redirect conventions not fixed

- **Location:** Consistency Conventions.
- **Problem:** HTML forms only send GET and POST. Agents will mix method-override, JSON endpoints, and redirect-vs-render after POST. The convention "error on the same page" implies re-render, but nothing is stated for success.
- **Fix:** One row: "Organizer routes are `/events/:id/...`. Mutations are `POST .../<verb>` (e.g. `/tasks/:id/delete`). On success, redirect (Post/Redirect/Get). On `DomainError`, re-render the same view with status 400. No JSON APIs."

### F-23 — Low — Cookie settings behind Render's proxy

- **Location:** Conventions (Auth).
- **Problem:** On Render (TLS terminated at a proxy), secure cookies need `app.set('trust proxy', 1)`. Without `sameSite: 'lax'`, organizer POSTs are open to CSRF.
- **Fix:** Add "cookie-session with `httpOnly`, `sameSite: 'lax'`, `secure` when `TEST_MODE` is off, `trust proxy` 1, 30-day maxAge."

### F-24 — Low — Over-engineering check: mostly appropriate; small trims

- **Location:** whole spine.
- **Problem:** The spine is lean for the scope. Two pieces cost more than they return before 14 Nov:
  - AD-6's generic Open Graph tags.
  - The traceability-against-docs test in AD-11.
  
  The four-account deploy (Render, Turso, cron-job.org, mail) is the largest beginner burden, but each account is justified.
- **Fix:** Keep as is. Optionally mark the Open Graph tags "nice-to-have". Schedule the deploy as an early thin-slice story (deploy "hello + DB + one email" in week 1) rather than last, so F-1 and F-8 surface early.

### F-25 — Low — Email templates and Norwegian email text have no home

- **Location:** Structural Seed; NFR-9; FR-18.
- **Problem:** The UI text lives in EJS views, but email bodies (reminder, link email) have no stated location, so they will end up as inline strings in services.
- **Fix:** "Email bodies are EJS templates in `views/emails/`, rendered by `mail/`. Reminder text is fixed (NFR-7)."

---

## What is good (keep)

- AD-2's single transition table with an explicit side-effect column is the best divergence-killer in the document.
- AD-7 "computed at check time + unique (task_id, accepted_at)" covers FR-7, FR-14, FR-17 catch-up and duplicates in one move.
- AD-8 pushes every plan (AI, template, mock) through one clamp and validator.
- AD-10 independence of `TEST_MODE` / AI key / SMTP matches FR-23 exactly.
- The capability map covers every FR and NFR listed in `binds`.
