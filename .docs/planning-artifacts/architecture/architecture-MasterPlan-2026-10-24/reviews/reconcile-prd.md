---
title: "Reconciliation: PRD -> Architecture Spine"
created: 2026-10-24
spine: ../ARCHITECTURE-SPINE.md
inputs: ['prds/prd-MasterPlan-2026-10-19/prd.md', 'prds/prd-MasterPlan-2026-10-19/addendum.md']
note: "Logged .memlog decisions are treated as deliberate. Where one contradicts the PRD, it is listed as a sync item, not a spine error."
---

# Reconciliation: PRD -> Architecture Spine

**Result: 22 gaps** (6 high, 8 medium, 8 low). Every FR-1..32 and NFR-1..9 is listed in `binds`, but some are bound in name only. The gaps below are places where the PRD needs something that no AD, convention or seed entry delivers, or where two ADs conflict.

## High

### G1. Reminder "same transaction" can't happen on the SMTP path (FR-17)
AD-7 says the `reminders_sent` row "is written in the same transaction as the email is queued". AD-9 sends production mail straight through Nodemailer SMTP, with no queue. An SMTP send can't be part of a DB transaction. So either a crash after the send and before the insert sends a duplicate, or a failed send after the insert means the reminder never goes out. Both break FR-17 ("never sends the same reminder twice" and "sends every due reminder").
**Fix (AD-7):** state the order. First claim by inserting `reminders_sent` (unique `(task_id, accepted_at)`), then call `mail/send`. If the send throws, delete the claim (or mark it `failed`) so the next run tries again. Accept at-most-once on a crash between the two steps. In test mode the outbox insert can share the transaction.

### G2. The "Simulate AI failure" toggle has no home (FR-26, FR-6, UJ-4)
No AD says where the toggle's state lives (session, organizer row, process memory) or how it reaches `ai/draftPlan`. AD-8 lists the fallback triggers (invalid plan, API error, 30 s timeout, no key) and leaves out the simulated failure.
**Fix (AD-8 + AD-10):** keep the toggle in the organizer's session (`session.simulateAiFailure`), and accept it only when `config.testMode`. `services/plans` passes `{ forceFail }` to `draftPlan`, which skips the provider and returns the fallback. A test covers this path.

### G3. The mock-AI notice can't be shown (FR-23 "says so", UJ-4 step 5)
AD-8 covers the *fallback* notice. Nothing tells the organizer that the *mock* was used. `draftPlan` returns only tasks, so the page can't tell an AI plan, a mock plan and a fallback plan apart.
**Fix (AD-8):** `draftPlan` returns `{ tasks, source: 'ai' | 'mock' | 'fallback', reason? }`. The event page shows a Norwegian notice for `mock` and for `fallback`.

### G4. The README can't list seeded helper links if the tokens are random (FR-25, FR-26, UJ-4)
FR-25 says "The README lists the seeded helper links". AD-6 makes tokens 24 random bytes, and AD-11 doesn't say that seed tokens are fixed. A fresh seed would then invalidate the README. Fixed tokens bring a second risk: if `npm run seed` runs against Turso, the deployed app gets a public test login and known helper links.
**Fix (AD-11):** `seed()` uses fixed, documented tokens for the seed helpers (still 24 bytes, base64url) and a fixed test password. `npm run seed` refuses to run when `TEST_MODE` is off or `DATABASE_URL` isn't a `file:` URL.

### G5. Nothing defines how a New reply becomes "seen" (Glossary "New reply", FR-20 Messages)
The Glossary counts a reply as seen "once she opens the Messages panel of that event". The panels are collapsible, and the spine allows no client JS except copy-link (memlog). A `<details>` panel opens without any request to the server, so `seen_at` would never be set. If seen-marking instead happens on plain page load, the count is always 0.
**Fix (new AD or AD-3 addendum):** opening Messages is a real request, for example `GET /events/:id?panel=messages` or a small `POST /events/:id/messages/seen`, and `services/messages.markSeen` sets `seen_at`. Note that the no-mutating-GET rule in AD-6 covers only helper routes. Count New replies as Message rows with `seen_at IS NULL`.

### G6. Tests aren't isolated from the developer's `.env` (FR-27, NFR-4)
AD-10 makes `config.ts` read `process.env`. Nothing stops `npm test` from loading a `.env` that has `ANTHROPIC_API_KEY` set, `TEST_MODE=false` or the dev `DATABASE_URL`. Tests would then call the paid API or the network, or touch seed data. That breaks FR-27 ("no API keys... no internet", "never change the seed data").
**Fix (AD-10/AD-11):** `config` is built by `loadConfig(env)`. The Vitest setup passes an explicit test env (`TEST_MODE=true`, no AI key, no SMTP, a temporary `DATABASE_URL` file) and never reads `.env`. Add one test asserting that `ai/anthropic.ts` isn't reached when there is no key.

## Medium

### G7. NFR-7 tone and NFR-9 Norwegian emails have no AD (FR-18, NFR-7, NFR-9)
NFR-7 is in `binds` but no rule implements it. The reminder and helper-link email texts have no stated home. The UI-text convention covers only EJS views, not email bodies, subjects, date formatting ("next due Friday") or how status values map to Norwegian labels.
**Fix (convention + AD-9):** keep all email texts as fixed Norwegian templates in `src/mail/texts.ts` (no AI, no humor, wording reviewed against NFR-7), with a snapshot test of the reminder text. Format dates with `Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo' })`. Keep status labels in one map in `src/views/labels.ts`. Pages use `<html lang="nb">`.

### G8. Copy link (FR-10, Must) would be blocked by helmet's CSP
The memlog allows "tiny inline JS only for copy-link". The spine adds helmet with defaults, and its CSP (`script-src 'self'`) blocks inline scripts. The Structural Seed also has no static-assets folder.
**Fix (convention + seed):** add `public/` served by `express.static`, with `public/copy.js`. Also show the link in a read-only, select-on-focus input, so copying still works if the clipboard API fails.

### G9. Open task past its deadline falls through the Glossary (FR-21, Glossary)
"Due within 3 days" means today or the next 3 days, so it leaves out past deadlines. An Open task whose deadline has passed and that was assigned under 7 days ago is then neither Urgent (that needs Accepted) nor Needs a helper. The event can show On track with an overdue unanswered task. The spine inherits this hole.
**Fix (AD-3):** state that an Open task is Needs a helper if `deadline <= today + 3` (past deadlines included). Flag this to the PRD as a Glossary correction.

### G10. Past-event exclusion contradicts the PRD (AD-3/M12, deliberate)
AD-3 leaves past events out of Urgent and Needs a helper. FR-21 says states are derived "exactly as defined in the Glossary", and "an event with Unassigned tasks is never On track". The decision was logged, so the spine is not wrong, but the PRD now disagrees with it. NFR-6's `[ASSUMPTION: 30 s]` and Open Questions 1 and 3 are also still open in the PRD, though AD-8 and the stack settle them.
**Fix:** add a PRD sync note (Glossary "On track"/FR-21: past events count as finished; NFR-6: 30 s confirmed). Have AD-3 say what a past event shows on the overview (for example "Avsluttet").

### G11. Cron cold start vs. the "at least once a day" check (FR-17, NFR-8)
Render free sleeps and takes about a minute to wake. cron-job.org's request timeout is shorter (around 30 s by default). The first daily call can time out, and catch-up then waits a full day, which can push a 3-days-before reminder past its useful point.
**Fix (AD-7):** `POST /internal/reminders/run` answers `202` at once and runs in the background, idempotent through G1's claim. Schedule two cron-job.org calls a few minutes apart (or a cheap warm-up GET first).

### G12. Helper email normalization (FR-8, AD-5)
Uniqueness on `(organizer_id, email)` treats `Ola@x.no` and `ola@x.no ` as different helpers. FR-8 would then fail in practice, because "the same helper" ends up split across events.
**Fix (AD-5):** trim and lowercase emails at the zod boundary before any lookup or insert. The same rule applies to organizer login emails.

### G13. FR-30 email correction and helper removal edge cases (FR-30, AD-12)
(a) If the corrected email already belongs to another of her helpers, the unique constraint fails, and no rule says what happens (refuse or merge). (b) AD-12 deletes the Helper row once no event links to it. Message rows reference `author helper_id`, and the tasks are kept (as Unassigned), so the delete either fails on the FK or wipes message history.
**Fix (AD-5/AD-12):** (a) refuse with a `DomainError('helper_email_taken')`. (b) Keep orphan Helper rows (simplest), or make `messages.helper_id` `ON DELETE SET NULL` and show "tidligere hjelper".

### G14. Companion docs required by FR-28 don't exist yet
The front matter lists `architecture-explained.md` and `cost-and-mock-plan.md`, and FR-28 says the cost-and-mock plan is "written in the architecture step". Only the spine and the memlog are in the folder.
**Fix:** write `cost-and-mock-plan.md` (Haiku about $0.06 per 100 drafts, $5 prepaid with no auto-reload, free tiers for Render/Turso/Gmail/cron-job.org, mock and outbox for examiners) before the spine leaves draft. Note that it gets copied to `docs/` in the repo.

## Low

### G15. `.gitignore` is missing (FR-28)
FR-28 says "`.env` is listed in `.gitignore`". The Structural Seed lists `.env.example` but has no `.gitignore`. The local database at `./data/local.db` (memlog) also needs ignoring.
**Fix (Structural Seed):** add `.gitignore` with `.env`, `data/`, `node_modules/` and the test DB files.

### G16. Safe defaults for `APP_BASE_URL` and `PORT` (FR-28, AD-10)
AD-10 makes `APP_BASE_URL` required only when `TEST_MODE` is off, and doesn't give its local default. `PORT`, which Render sets, isn't in the settings list, yet AD-10 says `config.ts` is the only reader of `process.env`.
**Fix (AD-10):** add `PORT` (default 3000). In `.env.example`, set `APP_BASE_URL=http://localhost:3000`, `DATABASE_URL=file:./data/local.db`, and a placeholder `SESSION_SECRET` that the app refuses to start with when `TEST_MODE` is off.

### G17. Migrations and the data folder in the Quick Start (addendum, UJ-4 step 1)
The addendum's Quick Start runs `npm install`, copies `.env`, then `npm run seed` and `npm run dev`, with no migrate step. The spine doesn't say who applies the drizzle migrations or creates `./data/`.
**Fix (AD-11):** `seed` and app startup both run `migrate()` first and create the `data/` folder if it's missing.

### G18. Assignment must use a linked helper (FR-9, AD-2)
AD-2's `assign`/`reassign` doesn't require the helper to be linked to the task's event through `event_helpers`. That leaves the five-helper cap (FR-8) open to being bypassed.
**Fix (AD-2):** the transition guard checks `event_helpers(event_id, helper_id)` exists.

### G19. `changed_since_answer` is never cleared except on reassign (AD-13, FR-7)
AD-13 sets the flag, and AD-2 clears it only on reassign or reopen. An Accepted helper can't re-answer yes, so "Endret etter at du svarte" stays forever.
**Fix (AD-13):** clear the flag on any later helper action on that task (no, done, cantDo), or add a "Sett" (seen) acknowledge button.

### G20. Day-boundary details (FR-17, FR-21, Glossary)
FR-21 says Needs a helper is "counted from the time of assignment" (7 days). The conventions compare Oslo calendar days, which is a fair reading, but say so explicitly. FR-17 says "accepted after the 3-days-before point", and acceptance on that exact Oslo day isn't specified.
**Fix (AD-4/AD-7):** `daysSince = osloDate(now) - osloDate(assigned_at)`, and 7 or more means Needs a helper. Acceptance on the day `deadline - 3` sends the reminder that day. Acceptance after that day sends nothing.

### G21. Deletion rule says less than its "Prevents" line (FR-32, AD-12)
AD-12's "Prevents" line names orphan outbox rows, but the rule doesn't cover them. `event_helpers` cascade isn't stated either.
**Fix (AD-12):** `event_helpers` uses `ON DELETE CASCADE`. Outbox rows are kept on purpose (they are a log), or deleted with the event. Pick one.

### G22. FR-1 detail left to stories (FR-1)
No rule covers the generic login error (don't reveal whether the email exists), unique organizer email, or logout clearing the cookie-session. This is acceptable at story level, but the error rule is a security consequence of NFR-2.
**Fix (Auth convention):** add "login failure shows one generic Norwegian message; organizer email unique (normalized, G12); logout sets `req.session = null`".

## Checked and landed

| Requirement | Where it landed |
|---|---|
| Opening a link never changes data (FR-12) | AD-6: GET never mutates, POST checks the current helper and AD-2 |
| Stale-page refusal (FR-12) | AD-6 + AD-2 guard |
| Token >= 128 bits (FR-12) | AD-6: 24 bytes = 192 bits |
| Reminder link rules (FR-12, FR-18) | AD-6 `?view=accepted`, same token |
| Privacy notice + no helper data to AI (NFR-3) | AD-8 (the spine sends only a subset of template fields, which is stricter than the PRD and deliberate) |
| Past-deadline clamp (FR-5) | AD-8 via `domain/plan.ts`, for AI, mock and template plans alike |
| Invalid-plan definition, 30 s timeout (FR-6, NFR-6) | AD-8 (stricter: 40 tasks, 120 characters) |
| Reminder timing, one per yes, catch-up, reschedule (FR-7, FR-14, FR-17) | AD-7 (apart from G1, G11, G20) |
| Sender "på vegne av" + Reply-To (FR-18) | AD-9 |
| Test inbox per organizer, test mode only (FR-24) | AD-9, AD-10 (assumes `routes/testMode.ts` sits behind `requireLogin`; worth stating in AD-10) |
| Controls hidden when test mode is off (FR-26) | AD-10 |
| Mock AI independent of test mode (FR-23) | AD-10 |
| Base URL in links (FR-28) | AD-10 `APP_BASE_URL` (defaults: G16) |
| Fixture table asserted (FR-20, FR-25) | AD-11 `docs/fixtures.md` + test |
| Dates relative to seed day, fixed test clock (FR-25, FR-27) | AD-4, AD-11 |
| Traceability table (FR-28) | `docs/traceability.md` in the seed |
| Isolation (FR-2), shared helper per organizer (FR-8) | AD-5 |
| State machine incl. Should FRs 14/30/31 (Glossary statuses) | AD-2 |
| Derived states computed every load (FR-21, FR-22) | AD-3, server rendering |
| Salted password hashes (NFR-2) | Auth convention (scrypt + salt) |
| One app, one DB, simplest scheduler (NFR-5) | Paradigm + AD-7 |
| Free hosting + real email (NFR-8), near-zero cost (NFR-4) | Stack, deployment diagram (NFR-4 already updated in PRD) |
| Norwegian UI (NFR-9) | UI-text convention (emails/dates: G7) |
| Mobile 360 px (NFR-1) | Deferred to UX, manual check, which is acceptable |
| Node 22+ (addendum) | Stack |
