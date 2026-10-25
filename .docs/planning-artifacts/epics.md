---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - .docs/planning-artifacts/prds/prd-MasterPlan-2026-10-19/prd.md
  - .docs/planning-artifacts/prds/prd-MasterPlan-2026-10-19/addendum.md
  - .docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md
  - .docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/cost-and-mock-plan.md
  - .docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/brief.md
  - .docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/tilbakemelding-product-brief.md
---

# MasterPlan - Epic Breakdown

## Overview

This document breaks the MasterPlan v1 PRD and the architecture spine down into implementable stories. There is no separate UX design document. The UX notes in the PRD addendum are used instead. The deadline is 14 November 2026. Must stories come first in build order. Should stories follow in the PRD §8 cut-list order, so they can be dropped from the end. The AI plan draft (Epic 2) and the fixed-text reminders (Epic 3) are Must and are never cut. Each story creates only the tables and migrations it needs (AD-14): organizers in 1.1, events and tasks in 1.2, helpers and event_helpers in 1.3, messages in 1.4, and reminders_sent and outbox_emails in 3.1.

## Requirements Inventory

### Functional Requirements

FR1 (Must): The organizer can create an account with name, email and password, and log in and out. A wrong password does not reveal whether the email exists. Organizer pages require login.
FR2 (Must): An organizer can see and change only her own events, tasks and helpers.
FR3 (Must): The organizer can create an event from the Wedding or Bachelorette party template, with name, what, where, date (not in the past), guest count, what needs to be done and other information.
FR4 (Must): Several events can be active at once, each with its own tab.
FR5 (Must): The AI drafts a plan of Unassigned tasks with titles and deadlines on or before the event date. Deadlines before today are set to today.
FR6 (Must): If the AI fails, times out or returns an invalid plan, the template's default plan is used and the organizer is told.
FR7 (Must): The organizer can add, change and delete any task's title and deadline. An unsent reminder is rescheduled.
FR8 (Must): The organizer can add up to five helpers per event by email, with an optional name. The same email across her events is the same helper.
FR9 (Must): The organizer can assign an Unassigned task to one of the event's helpers, and it becomes Open.
FR10 (Must: copy / Should: email): The organizer can copy a helper's link to paste into a chat (Must), or send it by email from the app (Should).
FR11 (Must): The organizer can reassign a task to another helper. It becomes Open for the new helper and leaves the old helper's page.
FR12 (Must): A helper link opens the helper page without login and shows only that helper's tasks. Invalid links reveal nothing. Tokens have at least 128 bits of randomness. Opening a link never changes data. The server refuses changes from a non-current helper or from stale pages.
FR13 (Must): On an Open task, the helper answers yes or no with an optional message. It shows as a New reply.
FR14 (Should): The helper can change Accepted to Declined and back. A New reply is created, and a new yes restarts the 14-day clock.
FR15 (Must): On an Accepted task, the helper reports Done or Can't be done, with an optional message, from the helper page or the reminder link.
FR16 (Must): The organizer can mark any task Done.
FR17 (Must, moved from Should by the user on 2026-10-24, brief must-work item 6): A reminder is sent at whichever comes first: 14 days after the latest yes, or 3 days before the deadline. No reminder if the yes came after the 3-day point. At most one per yes, one email per task. Late runs catch up without duplicates. The check runs at least daily.
FR18 (Must, moved from Should by the user on 2026-10-24): The reminder has a fixed respectful text and names one task, with a reminder link that shows only Accepted tasks. The sender is "MasterPlan på vegne av ‹organizer›", with Reply-To set to the organizer.
FR19 (Must, moved from Should by the user on 2026-10-24): The overview shows one summary per event: On track, or the counts of Urgent tasks and tasks in Needs a helper.
FR20 (Must): The event view shows the name, date, guest count, general information, Done "N of M", To do (Urgent and Needs a helper with the tasks listed), Timeline (days to the event and the next deadline) and Messages (New replies).
FR21 (Must): Statuses are derived per the Glossary, recalculated on every page load:
  - Open tasks need a helper after 7 days, or when the deadline is within 3 days or past.
  - Unassigned tasks always need a helper.
  - Past events are excluded.
FR22 (Must): Pages show the current state on every load. No real-time push.
FR23 (Must): Without an AI key the mock AI is used, with a notice. With test mode on, no email leaves the machine. Test mode is set in `.env` and is on in `.env.example`.
FR24 (Must, moved from Should by the user on 2026-10-24, so the examiner can see reminders): A test inbox shows the logged-in organizer's would-be emails, in test mode only.
FR25 (Must): One seed command loads a test organizer and two events with shared helpers, every task status, Urgent and Needs a helper, dates relative to the run day, a fixture table, and helper links listed in the README.
FR26 (Must for **Send due reminders now**, Should for the rest): In test mode the organizer also gets View as helper, seeded helper links, Send due reminders now, and Simulate AI failure.
FR27 (Must): `npm test` runs every test in test mode, with mock AI, no email, no keys and no network, using its own database and a fixed date, and ends with a pass/fail summary.
FR28 (Must): `.env.example` with safe defaults and the base URL, secrets never committed, `.env` in `.gitignore`. The README has a Quick Start, the test login, Things to try and Known limitations. The docs have the traceability table and the cost-and-mock plan.
FR29 (Should): The organizer can edit event fields. The date can't be moved into the past, and moving it doesn't move deadlines.
FR30 (Should): The organizer can correct a helper's email, which creates a new link and kills the old one, or remove a helper, which makes that helper's tasks Unassigned.
FR31 (Should): The helper can switch between Done and Can't be done. The organizer can reopen any task, which becomes Open again with a new reminder clock.
FR32 (Should): The organizer can delete an event together with its tasks and messages.
FR33 (Must): The delivery is the source code plus a `Dockerfile`. The container runs in test mode with the `.env.example` defaults, a local database file, the seed data and the test inbox. No secrets in the image; keys come from the environment later. The README explains the Docker steps.

### NonFunctional Requirements

NFR1: The helper page and the reminder link work from 360 px wide, with no sideways scrolling and easy-to-tap buttons.
NFR2: Security: helper links as in FR12, salted password hashes, login on organizer pages.
NFR3: Privacy: only the data the core loop needs is stored. Only the template, the date and the description go to the AI, never helper data.
NFR4: Near-zero cost. Free hosting, database and email. AI capped at $5. Test mode needs none of them.
NFR5: Simplicity: one app, one database, the simplest scheduler.
NFR6: The AI times out after 30 seconds and the fallback is used. [ASSUMPTION]
NFR7: Reminders are respectful and direct, never manipulative, and use no humor. The organizer can override any plan.
NFR8 (optional): The app can be deployed to free hosting for the friends test, with real email when test mode is off. Hosting is not a course requirement, so deployment is cut first if it causes problems.
NFR9: All UI text and emails are in Norwegian.

### Additional Requirements

From the architecture spine (AD-1 to AD-17):

- **No starter template.** The project is hand-scaffolded: Node ≥ 22.12, TypeScript run with tsx, Express 5, EJS 7, Drizzle 0.45 with @libsql/client, zod, cookie-session, helmet, Vitest and supertest. Versions are pinned as in the spine's Stack table, with the tsconfig rules from the Conventions. This is the first story.
- **Layers** run `routes → services → db`. The pure `domain/` takes `now` and `today` as input. Every link is built by `routes/paths.ts`. Form posts use Post/Redirect/Get with a flash notice. Error codes live in one registry in `domain/errors.ts` (AD-1).
- **Task changes.** `tasks.apply(actor, taskId, command, now)` is the only writer of tasks and messages and enforces the transition table. A task can only be assigned to helpers linked to its event. A repeated tap does nothing (AD-2).
- **Derived states** are computed only in `domain/status.ts` (AD-3).
- **Time.** `clock.now()` and `clock.today()` are the only time sources, and all date maths goes through `domain/dates.ts`. Dates are stored as `YYYY-MM-DD` and timestamps as UTC ISO strings. There are no SQL timestamp defaults (AD-4).
- **Scoping.** Every query is scoped to the organizer. Helpers are unique per (organizer, email), emails are lowercased, and helper rows are never deleted (AD-5).
- **Helper links.** Helper routes are `/h/:token`, with `?view=accepted` for the reminder link. Tokens are 24 random bytes. Responses send noindex and no-referrer headers (AD-6).
- **Reminders** are computed when the check runs, using a claim-then-send log in `reminders_sent`. The cron route is protected by a secret, and cron-job.org sends a wake-up request, then the POST twice (AD-7).
- **AI.** `ai/draftPlan` is the only entry point and returns `{tasks, source, notice}`. Template JSON files have a fixed shape, with one mock per template. One validator and date clamp handle every plan. The provider is Claude Haiku 5.5 at low effort with `max_tokens` 2000. The event form carries a privacy notice (AD-8).
- **Mail.** `mail/send` is the only sender, with fixed Norwegian texts in `mail/texts.ts`:
  - `TEST_MODE` writes to the `outbox_emails` table.
  - `MAIL_TRANSPORT=gmail` sends through the Gmail REST API.
  - `MAIL_TRANSPORT=disabled` is the fallback (AD-9).
- **Configuration.** `loadConfig(env)` is the only reader of settings. Tests pass an explicit environment, and the app fails fast on missing settings when test mode is off (AD-10).
- **Seed.** `seed(db, clock)` runs through the services with fixed tokens and exports `EXPECTED_COUNTS`. It refuses to run unless test mode is on and the database is a local file (AD-11).
- **Foreign keys** are on (`PRAGMA foreign_keys=ON`) and the cascades are defined (AD-12).
- **Changed accepted tasks** get a `changed_since_answer` flag. [ASSUMPTION, settle in the FR7 story] (AD-13)
- **Migrations** are generated with drizzle-kit and committed, and `db/migrate.ts` applies them on server start, seed and tests. `drizzle-kit push` is never used (AD-14).
- **New replies** become seen through `GET ?panel=messages` (AD-15).
- **Browser.** No inline JavaScript (`public/copy.js`), cookies are `httpOnly` and `sameSite=lax`, and helmet is on (AD-16).
- **Docker delivery.** A `Dockerfile` from `node:24-slim` and a `.dockerignore` without `.env` or `data/`. Settings come only from `docker run --env-file`. On first start in test mode the container seeds its database file, then starts the server (AD-17).
- **Deployment (optional, first to cut)** uses Render free, Turso free and cron-job.org. Gmail API OAuth needs a one-time setup script. Settings to configure: `APP_BASE_URL`, `DATABASE_AUTH_TOKEN`, `CRON_SECRET` and the Gmail credentials.

### UX Design Requirements

There is no UX design document. The layout notes in the PRD addendum apply:
- **Event view:** one tab per event, an information box on the left, and collapsible summary panels on the right.
- **Helper page:** a white, mobile-first page with a header and one card per task, each with Yes/No buttons and a message box.

### FR Coverage Map

FR1: Epic 1 - account and login
FR2: Epic 1 - organizer data isolation
FR3: Epic 1 - event from template
FR4: Epic 1 - several events
FR5: Epic 2 - AI plan draft
FR6: Epic 1 (template plan used as the plan) + Epic 2 (fallback when AI fails)
FR7: Epic 1 - edit the plan
FR8: Epic 1 - add helpers
FR9: Epic 1 - assign tasks
FR10: Epic 1 (copy link) + Epic 4 (send link by email)
FR11: Epic 1 - reassign
FR12: Epic 1 - link access and security
FR13: Epic 1 - yes/no answers
FR14: Epic 4 - change the answer
FR15: Epic 1 - Done / Can't be done (reminder link part in Epic 3)
FR16: Epic 1 - organizer marks Done
FR17: Epic 3 - reminder timing
FR18: Epic 3 - reminder content
FR19: Epic 1 - overview across events
FR20: Epic 1 - event view summaries
FR21: Epic 1 - status rules
FR22: Epic 1 - correct on every load
FR23: Epic 1 (test-mode setting) + Epic 2 (mock AI)
FR24: Epic 3 - test inbox
FR25: Epic 1 - seed data
FR26: Epic 3 (Send due reminders now) + Epic 4 (other test-mode controls)
FR27: Epic 1 (test setup; every later story adds its tests)
FR28: Epic 1 (README, .env.example, traceability, cost plan; kept up to date by later stories)
FR29: Epic 4 - edit event fields
FR30: Epic 4 - correct or remove helper
FR31: Epic 4 - undo and reopen
FR32: Epic 4 - delete event
FR33: Epic 1 (Story 1.6: Dockerfile, seed on first start, README Docker steps) + Epic 3 (Story 3.1: test inbox checked in the container)

## Epic List

### Epic 1: Kari plans with templates and Ola answers by link (first deployable version)
Kari logs in, creates events from templates, using each template's plan as the plan, edits the tasks, adds helpers, assigns tasks and copies each helper's link into a chat. Ola answers on his phone. Kari's overview shows which event needs attention, and her event view shows what is done, Urgent and in Needs a helper. The examiner can run it with Docker in test mode, with the seed data, from Story 1.6 on, and with `npm test`. The epic ends deployed on Render's free tier with Turso, with `MAIL_TRANSPORT=disabled`, so the friends test can start. Deployment is optional and cut first if it causes problems.
**FRs covered:** FR1, FR2, FR3, FR4, FR6 (template plan), FR7, FR8, FR9, FR10 (copy), FR11, FR12, FR13, FR15, FR16, FR19, FR20, FR21, FR22, FR23 (test-mode setting), FR25, FR27, FR28, FR33. NFR1, NFR2, NFR3, NFR5, NFR8, NFR9.

### Epic 2: The AI drafts the plan
Kari describes her event, and the AI drafts the task list, falling back to the template's plan when it fails. It is built with the mock first, and the real Anthropic API is connected last, with the $5 cap.
**FRs covered:** FR5, FR6 (AI fallback), FR23 (mock AI). NFR3 (privacy notice), NFR4, NFR6.

### Epic 3: Reminders keep helpers on track (Must)
Helpers get one fixed-text reminder email per yes at the right time. In test mode every email goes to the test inbox, and the examiner can trigger reminders with **Send due reminders now**. When deployed, email goes through the Gmail API. `MAIL_TRANSPORT=disabled` is only an emergency fallback.
**FRs covered:** FR17, FR18, FR24, FR26 (Send due reminders now), FR15 (reminder link), FR33 (test inbox in the container). NFR7, NFR8.

### Epic 4: More control for Kari (Should, cut from the end)
These are conveniences built in cut-list order: sending links by email, the other test-mode controls, correcting or removing helpers, undo and changed answers, and editing or deleting events.
**FRs covered:** FR10 (email), FR26 (other controls), FR30, FR31, FR14, FR29, FR32.

## Epic 1: Kari plans with templates and Ola answers by link (first deployable version)

Kari logs in, creates events from templates, using each template's plan as the plan, edits the tasks, adds helpers, assigns tasks and copies each helper's link into a chat. Ola answers on his phone. Kari's overview and event view show what is done, Urgent and in Needs a helper. The epic ends deployed for the friends test, and the examiner can run it locally from the first story on.

### Story 1.1: Project setup and organizer login

As an organizer,
I want to create an account and log in,
So that only I can reach my events.

**Acceptance Criteria:**

**Given** a fresh clone
**When** I run `npm install`, copy `.env.example` to `.env` and run `npm run dev`
**Then** the app starts on `http://localhost:3000`, applies migrations automatically (AD-14), and `GET /health` returns 200
**And** the project follows the spine's Stack versions, tsconfig rules, folder layout, `.gitignore` (`.env`, `data/`, `node_modules/`) and `.node-version`

**Given** the registration page
**When** I submit a name, an email and a password
**Then** an organizer is created with the email lowercased and the password stored as a salted scrypt hash, and I am logged in (FR1)

**Given** an existing account
**When** I log in with a wrong password or an unknown email
**Then** I see the same Norwegian error in both cases (FR1)
**And** logging out clears the session

**Given** I am not logged in
**When** I open any organizer page
**Then** I am redirected to the login page (FR1, NFR2)

**Given** two organizers A and B
**When** A requests a URL containing one of B's resource ids
**Then** the response is 404, and none of B's data is shown (FR2)

**Given** the test suite
**When** I run `npm test`
**Then** Vitest runs with `loadConfig` given an explicit test environment rather than `.env`, a fresh SQLite file database and a fixed clock, and prints a pass/fail summary (FR27, AD-10)
**And** `config.ts` validates every setting. With `TEST_MODE=false` and a missing `SESSION_SECRET`, `APP_BASE_URL` or `MAIL_TRANSPORT`, or an unknown `MAIL_TRANSPORT` value, the app refuses to start. `disabled` is accepted from this story on; `gmail` and its settings are added in Story 3.2 (FR23, AD-10)
**And** the session cookie is `httpOnly` and `sameSite=lax`, and helmet is on (AD-16)

### Story 1.2: Create events from templates and edit the plan

As an organizer,
I want to create my wedding and bachelorette events from templates and adjust their task lists,
So that I have a starting plan instead of a blank page.

**Acceptance Criteria:**

**Given** I am logged in
**When** I create an event from the **Bryllup** (Wedding) or **Utdrikningslag** (Bachelorette party) template, with a name, what, where, date, guest count, what needs to be done and other information
**Then** the event is saved and its tasks are created from the template's `defaultPlan`, with the `daysBeforeEvent` offsets turned into dates and every task Unassigned (FR3, FR6, AD-8)
**And** the template files are validated by zod at startup

**Given** a template task whose computed deadline is before today
**When** the event is created
**Then** that deadline is set to today, and the plan is still valid (FR5, AD-8)

**Given** two organizers A and B
**When** A requests or changes one of B's events or tasks by id or URL
**Then** the response is 404, and nothing changes (FR2)

**Given** the event form
**When** I submit it without a date, or with a date in the past
**Then** the event is not created, and a Norwegian error is shown with HTTP 422 (FR3)

**Given** I have created two events
**When** I open my pages
**Then** each event has its own tab (FR4)

**Given** an event's task list
**When** I add a task, rename one, change a deadline or delete a task
**Then** the change is saved through `services/tasks`. New tasks are Unassigned. Deleting a task also deletes its related rows, with `PRAGMA foreign_keys=ON` (FR7, AD-2, AD-12)

### Story 1.3: Add helpers, assign tasks and copy links

As an organizer,
I want to add my helpers by email, give each task to one of them and copy their link,
So that every task has a named person and I can share the links in our chat.

**Acceptance Criteria:**

**Given** an event
**When** I add a helper by email, with an optional name
**Then** the helper is linked to the event, the email is trimmed and lowercased, and the helper gets a 24-byte base64url link token (FR8, AD-5)
**And** adding the same email to my other event reuses the same helper and token
**And** adding a sixth helper to one event is refused with a Norwegian error

**Given** an Unassigned task
**When** I assign it to a helper linked to the event
**Then** it becomes Open, with `assigned_at = now` (FR9, AD-2)
**And** assigning it to a helper not linked to the event is refused

**Given** a helper
**When** I click **Kopier lenke**
**Then** `public/copy.js` copies the full helper link, which `routes/paths.ts` builds from `APP_BASE_URL`. There is no inline script, and a read-only field shows the link as a fallback (FR10 copy, AD-16)

**Given** a task assigned to helper A
**When** I reassign it to helper B
**Then** it becomes Open for B with a new `assigned_at`, `accepted_at` is cleared, and the service that lists a helper's tasks no longer returns it for A (FR11, AD-2). Story 1.4 checks the same on the helper page

**Given** my pages
**When** helpers are listed
**Then** each one shows the name, or the email if there is no name

**Given** two organizers A and B
**When** A tries to add, assign to or copy the link of one of B's helpers by id
**Then** the response is 404, and nothing changes (FR2)

### Story 1.4: Ola answers on his phone

As a helper,
I want to open my link and answer each task,
So that Kari knows what I will do, without me creating an account.

**Acceptance Criteria:**

**Given** a valid helper link `/h/:token`
**When** Ola opens it on a 360 px wide phone
**Then** he sees the header "Kari har invitert deg til å organisere …" and all of his tasks except Unassigned ones, grouped by event and sorted by deadline. There is no sideways scrolling, and the buttons are easy to tap (FR12, NFR1, NFR9)
**And** the response sends `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer`, with generic Open Graph tags (AD-6)

**Given** a changed, random or malformed token
**When** it is opened
**Then** a generic "link not valid" page is shown, and no data is revealed (FR12)

**Given** any helper GET request
**When** it is served
**Then** no data changes (FR12, AD-6)

**Given** an Open task
**When** Ola taps **Ja** or **Nei**, with or without a message
**Then** `tasks.apply` moves the task to Accepted (with `accepted_at = now`) or to Declined, and writes exactly one `messages` row with `seen_at = null` (FR13, AD-2)
**And** tapping the same answer again with no message changes nothing

**Given** an Accepted task
**When** Ola taps **Ferdig** or **Kan ikke gjøres**, with an optional message
**Then** the task becomes Done or Can't be done, and one message row is written (FR15)

**Given** a POST for a task that is not Ola's, or that stopped being his after a reassignment
**When** it reaches the server
**Then** it is refused, and nothing changes (FR12, AD-6)
**And** a task reassigned away from Ola no longer appears on his helper page (FR11)

**Given** any task in my event
**When** I, the organizer, mark it Done
**Then** it becomes Done, and no message row is written (FR16)

**Given** an Accepted task
**When** I change its title or deadline
**Then** its status stays the same and `changed_since_answer` is set. Ola's page shows "Endret etter at du svarte" until his next answer (FR7, AD-13)

### Story 1.5: Overview and event view show what needs attention

As an organizer,
I want one page that tells me which event needs me, and an event page with the details,
So that nothing gets stuck without me noticing.

**Acceptance Criteria:**

**Given** tasks in different states and a fixed `today`
**When** `domain/status.ts` evaluates them
**Then** it derives the states exactly as in AD-3 and FR21:
- **Urgent:** an Accepted task due within 3 days.
- **Needs a helper:** a task that is Unassigned, Declined or Can't be done, or an Open task that was assigned 7 or more Oslo days ago or is due within 3 days or overdue.
- **Past events:** left out of both counts.
- **On track:** no Urgent tasks and no tasks in Needs a helper.

**And** all date maths uses `domain/dates.ts` and the injected clock, with unit tests at every boundary: day 6 vs day 7, 3 vs 4 days left, and a deadline of today vs yesterday (AD-4)

**Given** I log in
**When** the first page loads
**Then** it shows one summary per event: **I rute** (On track), or the number of Urgent tasks and of tasks in Needs a helper (FR19)

**Given** I open an event tab
**When** the event view loads
**Then** it shows (FR20):
- an information box with the event name, date, guest count and general information
- **Done:** "N av M ferdig", where M counts all of the event's tasks
- **To do:** the number of Urgent tasks and of tasks in Needs a helper, with the tasks listed
- **Timeline:** days until the event, and the earliest deadline from today among tasks that are not Done
- **Messages:** the number of New replies

**Given** New replies exist
**When** I open the Messages panel (`GET /events/:id?panel=messages`)
**Then** the replies are listed, and only the rows shown get `seen_at = now` (AD-15)

**Given** a helper has answered
**When** I reload any of my pages
**Then** the new state is shown, without real-time push (FR22)

### Story 1.6: Seed data, Docker and examiner guide

As the examiner,
I want to start the app with ready-made data and a clear guide,
So that I can see the whole loop in a few minutes without keys or accounts.

**Acceptance Criteria:**

**Given** `TEST_MODE=true` and a `file:` database
**When** I run `npm run seed`
**Then** the database file is reset, and `seed(db, clock)` uses the services, with no direct inserts, to build (FR25, AD-11):
- the test organizer
- a Wedding event and a Bachelorette party event that share helpers
- tasks in every Task status, plus Urgent tasks and tasks in Needs a helper, with dates relative to today

**And** the Bachelorette party is On track and the Wedding has Urgent tasks
**And** the seeded helpers have fixed tokens from `seed/fixture.ts`

**Given** `TEST_MODE=false` or a database that is not a `file:` path
**When** `npm run seed` runs
**Then** it refuses, with a clear message (AD-11)

**Given** `EXPECTED_COUNTS` in `seed/fixture.ts`
**When** `npm test` runs
**Then** one test checks the overview and event-view counts against it, and another checks every seeded task with `assertFieldInvariant` (AD-11)

**Given** a clean clone and Docker
**When** I run `docker build -t masterplan .` and then `docker run --rm --env-file .env.example -p 3000:3000 masterplan`
**Then** the app starts in test mode with its database file at `/app/data/local.db` inside the container, the seed data is loaded on first start, and the test login at `http://localhost:3000` shows the seeded overview (FR33, FR25, AD-17)
**And** restarting the same container keeps its data, and a new container starts fresh with the seed
**And** the image contains no `.env` and no secrets. Every setting comes from the environment, so API keys can later be passed with `--env-file .env` or `-e` without changing the image (AD-17)

**Given** the repository
**When** the examiner reads it
**Then** it contains (FR28, FR33):
- **README:** Docker steps first (build, run with `--env-file .env.example`, open `http://localhost:3000`, log in with the test account, stop and reset), then a Quick Start (Node ≥ 22.12, `npm install`, copy `.env.example`, `npm run seed`, `npm run dev`), the test login, the seeded helper links, "Ting å prøve" (things to try) and "Kjente begrensninger" (known limitations)
- **`docs/fixtures.md`:** the expected counts
- **`docs/traceability.md`:** every FR built so far, mapped to its tests, with "manual" rows for the 360 px phone layout and the clipboard
- **`docs/cost-and-mock-plan.md`:** copied from the architecture folder
- **`.env.example`:** every setting, with safe defaults (`TEST_MODE=true`, `DATABASE_URL=file:./data/local.db`, `MAIL_TRANSPORT=disabled`) that also work for `docker run --env-file`
- **`Dockerfile`** and **`.dockerignore`** as in AD-17

### Story 1.7: Deploy for the friends test

*Cut note: hosting is not a course requirement; the delivery is the code and the Dockerfile (FR33, Story 1.6). If this story causes problems, it is the first thing cut, before any FR. The friends test then runs on a laptop on the same network, or is dropped and reported as such.*

As the developer,
I want the app running on free hosting,
So that my friends can open helper links on their phones and start testing.

**Acceptance Criteria:**

**Given** a free Turso database and a free Render web service connected to the repository
**When** the app is deployed with these settings:
- `TEST_MODE=false`
- Turso's `DATABASE_URL` and `DATABASE_AUTH_TOKEN`
- `APP_BASE_URL` set to the Render URL
- `SESSION_SECRET`
- `MAIL_TRANSPORT=disabled`

**Then** it starts on Node 24 (from `.node-version`), applies the migrations to Turso, and `/health` returns 200 (NFR8, AD-10, AD-14)
**And** no data is stored on Render's disk

**Given** the deployed app
**When** I register, create an event, add a friend as a helper and paste their link into a chat
**Then** my friend can open the link on a phone and answer, and the answer shows on my overview after a reload. This smoke test is written up in `docs/deploy.md`
**And** with `MAIL_TRANSPORT=disabled`, the app sends no email and starts without mail settings (AD-9, AD-10)

**Given** `docs/deploy.md`
**When** I read it
**Then** it lists every setting, warns about the Render cold start (about 1 minute), and gives the redeploy steps, without containing any secrets

## Epic 2: The AI drafts the plan

Kari describes her event, and the AI drafts the task list, falling back to the template's plan when it fails. The mock is built first, and the real API is connected last, with the $5 cap.

### Story 2.1: AI plan draft with mock and fallback

As an organizer,
I want the app to draft a task list from my description,
So that the plan fits my event, not just the template.

**Acceptance Criteria:**

**Given** the event form
**When** it is shown
**Then** it includes a Norwegian notice that the description is sent to an AI service, and that helpers' names and emails are never sent (NFR3, AD-8)

**Given** no `ANTHROPIC_API_KEY` is configured
**When** I create an event
**Then** `ai/draftPlan({ templateKey, eventDate, description, forceFailure })` returns the template's mock plan with `source: 'mock'`, and the page shows that a test plan was used (FR23, AD-8)

**Given** any plan (AI, mock or template)
**When** it passes through `domain/plan.ts`
**Then** offsets become dates, dates before today are set to today, and the plan is invalid if any of these hold (FR5, FR6, AD-8):
- it doesn't match the schema
- it has no tasks or more than 40
- a title is longer than 120 characters
- a deadline falls after the event date

**Given** the provider throws, times out after 30 seconds, returns an invalid plan, or `forceFailure` is true in test mode
**When** I create an event
**Then** the template's default plan is used with `source: 'fallback'`, a Norwegian notice is shown, and the event is still created (FR6, NFR6)
**And** `forceFailure` is ignored when `TEST_MODE` is off

**Given** `draftPlan`
**When** it runs
**Then** it runs before the database transaction that creates the tasks, and all drafted tasks are Unassigned (AD-8, AD-2)
**And** unit tests cover every validation rule and the fallback, using a fake provider and no network

### Story 2.2: Connect the Anthropic API with a spending cap

As the developer,
I want real AI drafts on the deployed app, at a guaranteed maximum cost,
So that my friends test the real plan draft without any risk of a big bill.

**Acceptance Criteria:**

**Given** `ANTHROPIC_API_KEY` is set
**When** an event is created
**Then** `ai/anthropic.ts` is the only file that calls `@anthropic-ai/sdk`. It uses:
- model `claude-haiku-5-5`
- `messages.parse` with a zod output format via `output_config.format`
- effort `low`
- `max_tokens` 2000
- a 30-second timeout

**And** the result returns `source: 'ai'` (FR5, AD-8, NFR4, NFR6)

**Given** the request
**When** it is built
**Then** it contains only the template key, the event date and the description. A test asserts that no helper data is present (NFR3)

**Given** the test suite
**When** `npm test` runs
**Then** no test calls the real API, even if a key exists in the developer's `.env` (FR27, AD-10)

**Given** `docs/deploy.md`
**When** I follow its AI section
**Then** it explains how to:
- buy the minimum prepaid credit, about $5
- turn **off** auto-reload
- set a $5 monthly spend limit in the Console
- add the key on Render only

**And** the cost-and-mock plan is up to date (NFR4, FR28)

## Epic 3: Reminders keep helpers on track (Must)

Helpers get one fixed-text reminder email per yes at the right time. In test mode every email goes to the test inbox. When deployed, email goes through the Gmail API. `MAIL_TRANSPORT=disabled` is only an emergency fallback.

### Story 3.1: Reminders and the test inbox

As a helper,
I want one friendly reminder before my task is due,
So that I don't forget what I promised.

**Acceptance Criteria:**

**Given** Accepted tasks and a fixed clock
**When** `services/reminders.run(now, today)` runs
**Then** a reminder is due for each task at whichever comes first, `osloDate(accepted_at) + 14` or `deadline − 3`, and none is due when the yes came after the 3-day point (FR17, AD-7)
**And** tasks that are Done, Can't be done, Declined, Open or Unassigned get none

**Given** a due task
**When** the run handles it
**Then** it first inserts a row into `reminders_sent`, unique on `(task_id, accepted_at)`, and then calls `mail.send`. If the send fails, it deletes the row (AD-7)
**And** a second run, or a run that is days late, never sends the same reminder twice, and it catches up on missed ones
**And** a task with a new `accepted_at` gets its own reminder, because the log is unique per `(task_id, accepted_at)`

**Given** `mail/texts.ts`
**When** a reminder is built
**Then** it has:
- a fixed, respectful and direct Norwegian text, "Påminnelse om oppgaven fra ‹organizer›"
- the one task it covers, with its date in `nb-NO` format
- a reminder link `/h/:token?view=accepted`

**And** a snapshot test covers the text (FR18, NFR7, NFR9)

**Given** the reminder link
**When** Ola opens it
**Then** it shows only his Accepted tasks, each with **Ferdig** and **Kan ikke gjøres** (FR15, FR18)

**Given** `TEST_MODE=true`
**When** an email is sent
**Then** it is stored in `outbox_emails`. A logged-in organizer's test inbox page lists only her own rows, showing recipient, subject, text, links and time, and it can't be reached without login or when test mode is off (FR24, AD-9)

**Given** `CRON_SECRET` is set
**When** `POST /internal/reminders/run` arrives with the correct `X-Cron-Secret`, compared with `timingSafeEqual`
**Then** the run starts. A wrong or missing secret gets 403, and the route doesn't exist when `CRON_SECRET` is unset (AD-7)

**Given** `TEST_MODE=true` and a logged-in organizer
**When** I click **Send påminnelser nå** (Send due reminders now)
**Then** the same `reminders.run` runs immediately, and the resulting emails appear in my test inbox. The button doesn't exist when test mode is off (FR26, AD-7)

**Given** the Docker container from Story 1.6, started with `--env-file .env.example`
**When** I log in with the test account and click **Send påminnelser nå**
**Then** the reminders appear in the test inbox inside the container, with no keys or network, and the README's Docker steps and "Ting å prøve" mention the test inbox (FR33, FR24, AD-17)

### Story 3.2: Real email through the Gmail API

As the developer,
I want the deployed app to send real email from the dedicated MasterPlan Gmail account,
So that my friends get reminders during the test.

**Acceptance Criteria:**

**Given** `MAIL_TRANSPORT=gmail` and the four Gmail settings
**When** `mail.send` runs with `TEST_MODE` off
**Then** the message is built as MIME by Nodemailer's `MailComposer` and sent over HTTPS with the Gmail REST API, through `google-auth-library` (AD-9)
**And** the sender name is "MasterPlan på vegne av ‹organizer›", and `Reply-To` is the organizer's email
**And** a failed send throws `MailError` and logs one line

**Given** `MAIL_TRANSPORT` is missing or unknown, or Gmail settings are missing while it is `gmail`
**When** the app starts with `TEST_MODE` off
**Then** it refuses to start, with a clear error (AD-10)

**Given** `scripts/gmail-auth.ts` and the Gmail section in `docs/deploy.md`
**When** I follow them once
**Then** I can:
- create a Google Cloud project
- set the OAuth consent screen to "In production"
- get a refresh token
- store all settings on Render only

**And** the guide explains the fallback: set `MAIL_TRANSPORT=disabled`

**Given** cron-job.org
**When** it is set up as in `docs/deploy.md`
**Then** it calls `GET /health`, then the reminder POST 3 minutes later, then the POST again 10 minutes after that, every day (AD-7)
**And** a real reminder sent to my own address arrives in the inbox, not spam (manual check in `docs/traceability.md`)

## Epic 4: More control for Kari (Should, cut from the end)

These are conveniences, built in the PRD's Should order. If time runs out, drop them from the last story backwards.

### Story 4.1: Send helper links by email

As an organizer,
I want to send a helper their link by email from the app,
So that helpers who aren't in our chat still get it.

**Acceptance Criteria:**

**Given** a helper and email that is enabled (`gmail`, or test mode)
**When** I click **Send lenke på e-post**
**Then** `mail.send` sends one email of kind `helper_link`, using the fixed Norwegian text from `mail/texts.ts` and containing the helper link (FR10 email)
**And** in test mode it appears in the test inbox

**Given** `MAIL_TRANSPORT=disabled` with test mode off
**When** I view helpers
**Then** the button is hidden, and copying the link still works

### Story 4.2: Test-mode controls

As the examiner,
I want shortcuts that show the hidden parts of the app,
So that I can check helper pages, reminders and the AI fallback in minutes.

**Acceptance Criteria:**

**Given** `TEST_MODE=true` and a logged-in organizer
**When** I open my pages
**Then** I see (FR26):
- **Vis som hjelper** (View as helper) for each helper, which opens their page in a new tab
- a list of the seeded helper links
- a **Simuler AI-feil** (Simulate AI failure) toggle, stored in the session and passed to `draftPlan` as `forceFailure`

**Given** `TEST_MODE=false`
**When** any page loads
**Then** none of these controls appear, and the `/test/*` routes are not mounted (FR26, AD-10)

### Story 4.3: Correct or remove a helper

As an organizer,
I want to fix a mistyped email or take a helper off an event,
So that tasks never sit with the wrong person.

**Acceptance Criteria:**

**Given** a helper
**When** I correct their email
**Then** the email is lowercased and a new token is issued. The old link shows "link not valid" (FR30, AD-5)
**And** the correction is refused with `email_in_use` if I already have a helper with that email

**Given** a helper on an event
**When** I remove them
**Then** the `event_helpers` row is deleted. Their Open, Accepted, Declined and Can't be done tasks in that event become Unassigned and leave their page, while Done tasks keep their helper. The Helper row is kept (FR30, AD-2, AD-12)

### Story 4.4: Undo, reopen and change answers

As a helper or organizer,
I want to correct an answer,
So that a tap by mistake or a change of plans doesn't get stuck.

**Acceptance Criteria:**

**Given** a Done or Can't be done task
**When** Ola switches it to the other one
**Then** it changes, and one message row is written (FR31)

**Given** any assigned task
**When** I reopen it, for the same helper or another
**Then** it becomes Open, with a new `assigned_at` and `accepted_at` cleared (FR31, AD-2)

**Given** an Accepted task
**When** Ola changes his answer to no, or later back to yes
**Then** the status changes and a New reply is created. A new yes sets a new `accepted_at`, so the 14-day clock restarts (FR14, AD-2, AD-7)

*Cut note: if time runs short, FR14 (changing an answer) can be dropped from this story first, because FR31 ranks above it.*

### Story 4.5: Edit and delete events

As an organizer,
I want to fix an event's details or delete an event,
So that my plans stay accurate.

**Acceptance Criteria:**

**Given** an event
**When** I edit its fields
**Then** they are saved. The date can't be set in the past, and changing it does not move task deadlines (FR29)

**Given** an event
**When** I delete it and confirm
**Then** its tasks, messages, reminder logs and event-helper links are deleted, and its tasks disappear from all helper pages (FR32, AD-12)

*Cut note: FR32 (delete) can be dropped first, then FR29 (edit).*
