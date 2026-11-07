---
title: 'Story 3.1: Reminders and the test inbox'
type: 'feature'
created: '2026-11-07'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-3-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Helpers say yes and nothing reminds them afterwards. The brief calls the fixed-text reminder a must-work item and the core of the product («follow-through»), and it is FR-17, FR-18, FR-24 and FR-26 (Send due reminders now) in the PRD. Today there is no `mail/` module, no reminder rule, no `reminders_sent` or `outbox_emails` table, no test inbox and no reminder link.

**Approach:** Add `domain/reminderDue.ts` for the timing rule, `services/reminders.run(now, today)` that claims each due reminder in `reminders_sent` before sending it, and the `mail/` module with one `send` entry point and fixed texts. In test mode every email is stored in `outbox_emails` and shown in a test inbox, and **Send påminnelser nå** starts the run. The reminder link `/h/:token?view=accepted` shows only the helper's Accepted tasks. Real email through Gmail, the cron route `POST /internal/reminders/run` and `CRON_SECRET` are Story 3.2, which is only needed for a deployed app and is deferred or cut together with Story 1.7.

**Decisions (proposed 2026-11-07, approved by the user 2026-11-07):**
- **D1 The reminder text.** Fixed Norwegian text from `mail/texts.ts`, respectful and direct, with no humour or guilt (NFR-7). The subject is «Påminnelse om oppgaven fra ‹organizer›». The body is shown under Design Notes. A helper with no name gets «Hei,» without a name.
- **D2 Where the test inbox and the button live.** In test mode the site header shows a «Testinnboks» link next to the organizer's name. The page `/test/innboks` lists the emails, newest first, and has the **Send påminnelser nå** button at the top. With test mode off, neither the link, the page nor the button exists. Story 4.2 adds its other controls on the same page.
- **D3 The button runs the whole check.** **Send påminnelser nå** calls `reminders.run(now, today)` for all organizers, the same function the cron route in Story 3.2 will call. The flash counts only the reminders sent for the logged-in organizer's events, so she never learns anything about other organizers. In test mode every email lands in its own organizer's inbox, so nothing leaks.
- **D4 `MAIL_TRANSPORT=disabled` sends no reminders and claims none.** With test mode off and `disabled`, `run` returns at once and logs one line. No `reminders_sent` rows are written, so reminders are not marked as sent when nothing went out. If Story 3.2 later enables Gmail, the due reminders are sent then (risk noted in `deferred-work.md`).
- **D5 A late run also sends reminders for a passed deadline.** PRD FR-17 says a late check sends every due reminder. A task that is still Accepted after its deadline gets its one reminder; the text gives the original date. With a daily check this only happens when the check has been down for days (risk noted in `deferred-work.md`).
- **D6 After an answer from the reminder link, the helper lands on the full page.** The buttons post to the same route as on the full page, and the redirect shows the usual notice on `/h/:token`. The task he just finished is then shown as Ferdig in context. The reminder view itself never writes (FR-12).
- **Scope change (user, 2026-11-07):** the cron route and `CRON_SECRET` moved from this story to Story 3.2, because only a deployed app needs something outside it to start the daily check. `epics.md` is updated.

## Boundaries & Constraints

**Always:**
- `domain/reminderDue.ts` exports `reminderDueDate(task)` and `isReminderDue(task, today)`. `task` is `{ status, acceptedAt, deadline }`. Only `accepted` tasks with `acceptedAt` have a due date: the earlier of `addDays(osloDate(acceptedAt), 14)` and `addDays(deadline, -3)`. When `osloDate(acceptedAt)` is after `deadline − 3`, there is none. A reminder is due when its date is today or earlier. All date work goes through `domain/dates.ts` (AD-4).
- `services/reminders.run(deps, now, today)` with `deps = { db, config, send }` selects Accepted tasks with their event, organizer and helper, and for each due one: inserts `reminders_sent (task_id, accepted_at, sent_at)` with `onConflictDoNothing`; skips the task if no row was inserted; calls `send`; and deletes the row and logs one line if `send` throws. It returns the sent reminders as `{ organizerId, taskId }[]` and logs one summary line per run (AD-7). Mail is sent outside any transaction. The signature is ready for the Story 3.2 cron route, which adds no logic of its own.
- `mail/index.ts` exports `send(db, config, message, now)`, the only way to send (AD-9). `message` is `{ organizerId, to, subject, text, links, kind: 'reminder' }`; `send` looks up the organizer's name and email itself. With `TEST_MODE=true` it inserts an `outbox_emails` row with `from_name` «MasterPlan på vegne av ‹organizer›» and `reply_to` the organizer's email. With test mode off and `disabled`, it writes nothing and logs one line. A failure throws `MailError`.
- `mail/texts.ts` builds the reminder subject, text and link from the organizer name, helper name, event name, task title, deadline (`formatDateNb`) and `absoluteUrl(appBaseUrl, paths.helperReminder(token))`.
- One migration from `drizzle-kit generate` adds `reminders_sent` (unique on `task_id, accepted_at`, cascading from `tasks`) and `outbox_emails` (foreign key to `organizers`) (AD-12, AD-14).
- `/test/innboks` (GET) and `/test/paminnelser` (POST) are mounted only in test mode, both behind `requireLogin`. The inbox query filters on the session's organizer id (FR-24, AD-5).
- `GET /h/:token?view=accepted` writes nothing and keeps the AD-6 headers. Any other `view` value shows the full page.
- UI text in Norwegian, singular for one («1 påminnelse er sendt.»), with an empty state on both the test inbox and the reminder view.

**Never:** the cron route `POST /internal/reminders/run`, `CRON_SECRET` in config or `.env.example`, Gmail, Nodemailer or `google-auth-library`, `gmail` as a `MAIL_TRANSPORT` value, `docs/deploy.md` or cron-job.org setup (all Story 3.2); sending helper links by email (4.1); other test-mode controls (4.2); changing an answer (3.3); a stored reminder schedule; `new Date()` outside `clock.ts`; network access in tests.

## I/O & Edge-Case Matrix

Dates relative to a fixed today T. «Yes» is the Oslo date of `accepted_at`.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 14 days first | yes T−14, deadline T+20 | due T (14-day point) | N/A |
| Deadline first | yes T−5, deadline T+3 | due T (deadline − 3) | N/A |
| Not yet | yes T−13, deadline T+20 | not due | N/A |
| Yes on the 3-day point | yes T, deadline T+3 | due T | N/A |
| Yes after the 3-day point | yes T, deadline T+2 | no due date | N/A |
| Other statuses | done, cant_do, declined, open, unassigned | no due date | N/A |
| Oslo midnight | `accepted_at` 2026-03-28T23:30Z (Oslo 29 March) | counts from 29 March | N/A |
| Second run | same tasks, run twice | second run sends 0 | unique row skips |
| Late run | due date T−6, never sent | sent once at T | N/A |
| Passed deadline | still Accepted, deadline T−1, not sent | sent once (D5) | N/A |
| New yes | reminder sent for `accepted_at` A, task now has `accepted_at` B and is due | a second reminder is sent | N/A |
| Send fails | `send` throws for one task | its `reminders_sent` row is gone; other tasks are still sent; next run retries it | one log line |
| Disabled | test mode off, `disabled` | nothing sent, no rows written (D4) | one log line |
| Test inbox isolation | Kari and Eva each have emails | Kari's inbox shows only hers | N/A |
| Inbox without login / test mode off | GET `/test/innboks` | redirect to login / 404 | N/A |
| Button with test mode off | POST `/test/paminnelser` | 404, nothing runs | N/A |
| Reminder view | Ola has Accepted, Open and Done tasks | only the Accepted ones, each with Ferdig and Kan ikke gjøres | N/A |
| Reminder view, nothing left | no Accepted tasks | empty-state text and a link to the full page | N/A |
| Seed | fresh seed at T, run at T | 12 reminders (2 Wedding, 10 Bachelorette), second run 0 | N/A |

## UX

Text sketches at mobile width (360 px). Both pages reuse existing components: the site header, the flash (`role="status"`), `muted` text, the primary button, and the helper cards and buttons from Story 1.4. No new colours, no inline JavaScript. Every control is a link, a button or a labelled field, so the pages work by keyboard in the existing tab order.

**Test inbox, `/test/innboks` (organizer, test mode only).** The «Testinnboks» link sits in the site header on every organizer page. The flash after **Send påminnelser nå** is the existing flash at the top. Each email is a card with the recipient, the Oslo time (`formatDateTimeNb`), the subject as a heading, the text with its line breaks kept, and the link as a real link, so the examiner can open the reminder view from it. Long links wrap instead of scrolling sideways.

```
┌──────────────────────────────────┐
│ MasterPlan          Testinnboks  │
│                   Kari  Logg ut  │
├──────────────────────────────────┤
│ 12 påminnelser er sendt.         │
│                                  │
│ Testinnboks                      │
│ E-poster appen ville sendt.      │
│ Ingen e-post forlater maskinen.  │
│                                  │
│ [ Send påminnelser nå ]          │
│ ──────────────────────────────── │
│ ┌──────────────────────────────┐ │
│ │ Påminnelse om oppgaven fra   │ │
│ │ Kari                         │ │
│ │ Til: ola@example.com         │ │
│ │ 7. november 2026 kl. 15:20   │ │
│ │                              │ │
│ │ Hei Ola,                     │ │
│ │ Du har sagt ja til å ta deg  │ │
│ │ av «Bestille kake» for       │ │
│ │ Bryllup, med frist …         │ │
│ │                              │ │
│ │ http://localhost:3000/h/…    │ │
│ │ ?view=accepted               │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Påminnelse om oppgaven fra … │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

Flash texts: «Ingen påminnelser har forfalt.», «1 påminnelse er sendt.», «12 påminnelser er sendt.» Empty state, below the button: «Ingen e-poster ennå. Klikk «Send påminnelser nå» for å sende påminnelser som har forfalt.»

**Reminder view for the helper, `/h/:token?view=accepted`.** Same helper header and cards as the full helper page (Story 1.4), so the helper recognises it. Only Accepted tasks, grouped by event, each with the optional message field and **Ferdig** and **Kan ikke gjøres**. A link at the bottom leads to the full page. After an answer he lands on the full page with the usual notice (D6).

```
┌──────────────────────────────────┐
│ MasterPlan                       │
│ Oppgaver du har sagt ja til      │
│ fra Kari                         │
├──────────────────────────────────┤
│ Bryllup  12. desember 2026       │
│ ┌──────────────────────────────┐ │
│ │ Kari vil at du skal          │ │
│ │ Planlegge bordplassering     │ │
│ │ innen 7. november 2026       │ │
│ │ Du har sagt ja               │ │
│ │ Melding (valgfritt)          │ │
│ │ [                          ] │ │
│ │ [ Ferdig ] [Kan ikke gjøres] │ │
│ └──────────────────────────────┘ │
│                                  │
│ Utdrikningslag  …                │
│ ┌──────────────────────────────┐ │
│ │ …                            │ │
│ └──────────────────────────────┘ │
│                                  │
│ Se alle oppgavene dine           │
└──────────────────────────────────┘
```

Empty state, when nothing is Accepted any more: «Du har ingen oppgaver som venter på deg nå.» followed by the «Se alle oppgavene dine» link.

</frozen-after-approval>

## Code Map

Reuse the Epic 1 and 2 code; don't restructure it.

- `src/domain/dates.ts` -- `osloDate`, `addDays`, `formatDateNb`, `formatDateTimeNb`; all reminder date work uses these.
- `src/domain/status.ts` -- the Urgent rule (deadline ≤ today + 3); a yes after the 3-day point is Urgent instead of reminded, so no change is needed.
- `src/domain/taskRules.ts:127` -- a yes sets `acceptedAt = now`; a repeated yes with a message is `messageOnly` and keeps `acceptedAt`, so it does not restart the clock.
- `src/db/schema.ts` -- add `remindersSent` and `outboxEmails`; the next migration is `0004_*` in `src/db/migrations/`.
- `src/config.ts` -- no change; `MAIL_TRANSPORTS` stays `['disabled']` and `CRON_SECRET` waits for 3.2.
- `src/routes/paths.ts` -- add `testInbox`, `runReminders` and `helperReminder(token)` (`/h/:token?view=accepted`); `absoluteUrl` builds the link.
- `src/routes/helper.ts` -- GET `/h/:token`: filter `page.events[].tasks` to `accepted` when `view=accepted`, drop empty events, and pass a `reminderView` flag. POST is unchanged (D6).
- `src/services/helpers.ts` -- `helperPage(db, token)` already returns every task with its status and allowed actions; reuse it.
- `src/routes/middleware.ts` -- `requireLogin`, `organizerOf`, `setFlash`.
- `src/app.ts` -- mount `routes/testMode.ts` only when `config.testMode`, after the session; set `res.locals.testMode` for the header link.
- `src/views/partials/top.ejs` -- the header; add the «Testinnboks» link in test mode.
- `src/views/helper.ejs` -- add the reminder-view heading, empty state and «Se alle oppgavene dine» link.
- `seed/fixture.ts`, `docs/fixtures.md` -- add `EXPECTED_REMINDERS_DUE` (12) and its row.
- `tests/helpers.ts` -- existing test app and fixed-clock helpers; reuse them in the new tests.

## Tasks & Acceptance

**Execution:**
- [ ] `tests/reminderDue.test.ts`, `tests/reminders.test.ts`, `tests/mailTexts.test.ts`, `tests/testInbox.test.ts`, and additions to `tests/helperPage.test.ts` and `tests/seed.test.ts` -- written first, from the matrix and the ACs -- FR-17, FR-18, FR-24, FR-26, FR-15
- [ ] `src/db/schema.ts` + `src/db/migrations/0004_*` -- the two tables -- AD-12, AD-14
- [ ] `src/domain/reminderDue.ts` -- the timing rule -- FR-17, AD-7
- [ ] `src/mail/index.ts`, `src/mail/texts.ts`, `src/mail/outbox.ts` -- `send`, `MailError`, fixed texts, outbox insert and list -- AD-9, NFR-7
- [ ] `src/services/reminders.ts` -- `run` with claim, send and release -- AD-7
- [ ] `src/routes/testMode.ts`, `src/routes/paths.ts`, `src/app.ts` -- the inbox and the button -- FR-24, FR-26
- [ ] `src/views/test-inbox.ejs`, `src/views/partials/top.ejs`, `src/views/helper.ejs`, `public/styles.css` -- inbox, header link, reminder view, as in the UX sketches -- FR-24, FR-18, NFR-1
- [ ] `seed/fixture.ts`, `docs/fixtures.md` -- expected reminder count
- [ ] Docs: README (Docker section, «Ting å prøve», «Kjente begrensninger»: no automatic daily check until 3.2), `docs/traceability.md` (FR-17, FR-18, FR-24, FR-26 and the Docker check moved from «Ikke bygget ennå»), `sprint-status.yaml`

**Acceptance Criteria** (each names the test that proves it):
1. Given Accepted tasks and a fixed clock, when `reminderDueDate` and `isReminderDue` run, then every timing row of the matrix holds, including Oslo midnight. *Test:* `tests/reminderDue.test.ts`.
2. Given due tasks, when `run` runs twice, or days late, then each `(task_id, accepted_at)` gets exactly one email and one `reminders_sent` row; a new `accepted_at` gets its own; a throwing `send` leaves no row for that task and the next run sends it; with `disabled` and test mode off nothing is sent or claimed. *Test:* `tests/reminders.test.ts`.
3. Given a reminder for Ola about «Bestille kake» from Kari, then subject, text and link match the snapshot, the date is `nb-NO`, and a helper with no name gets «Hei,». *Test:* `tests/mailTexts.test.ts`.
4. Given `TEST_MODE=true`, when a reminder is sent, then an `outbox_emails` row has the recipient, «MasterPlan på vegne av Kari», Kari's email as `reply_to`, subject, text, the link and the time; and the logged-in organizer's `/test/innboks` lists only her rows, newest first, with an empty state when there are none. Without login it redirects to login, and with test mode off it is 404. *Test:* `tests/testInbox.test.ts`.
5. Given a logged-in organizer in test mode, when she posts **Send påminnelser nå**, then `run` runs, she is redirected to the test inbox with a flash counting her own reminders («Ingen påminnelser har forfalt.», «1 påminnelse er sendt.», «12 påminnelser er sendt.»); with test mode off the button, the header link and the POST route are absent. *Test:* `tests/testInbox.test.ts`.
6. Given Ola's reminder link, when he opens it, then only his Accepted tasks are shown, each with **Ferdig** and **Kan ikke gjøres**; nothing is written; with no Accepted tasks an empty state and a link to the full page are shown. *Test:* `tests/helperPage.test.ts`.
7. Given a fresh seed, when the run happens on the seed day, then 12 reminders are sent and a second run sends 0. *Test:* `tests/seed.test.ts`.
8. Given the Docker container started with `--env-file .env.example`, when I log in as Kari and click **Send påminnelser nå**, then 12 reminders appear in the test inbox, with no keys or network. *Manual check*, recorded in `docs/traceability.md`.
9. Given `npm test`, then no test opens a network connection, all tests pass, and `npm run typecheck` and `npm run lint` are clean.

## Definition of Done

From `CLAUDE.md`. The story is done when:

1. Acceptance criteria 1–9 are met, and `docs/traceability.md` maps each one to its code and tests.
2. The tests were written from the matrix and the ACs before the implementation, and `npm test` and `npm run typecheck` are green.
3. Input is validated (the `view` query, the organizer id from the session), send failures are logged and retried, the user sees understandable Norwegian messages, and no secret is added.
4. The test inbox, header link and reminder view follow the UX sketches, match the existing look, have empty states, are usable by keyboard, and work at 360 px.
5. No dead code or leftovers: no unused Gmail or cron code or settings for 3.2.
6. README, `docs/fixtures.md` and `docs/traceability.md` are updated; any change from this spec is explained in Spec Change Log; `sprint-status.yaml` is set to `done`.
7. The work is on `story/3-1-reminders-and-the-test-inbox` with small commits (tests, schema and domain, mail and service, routes and views, docs), merged through a pull request that says how it was tested and which faults were found in AI-generated code; each corrected, rejected or clarified AI suggestion is logged in `docs/ki-logg.md`; `npm run lint` passes before each commit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

**Reminder text (D1),** for Ola, Kari's task «Bestille kake» in «Bryllup» with deadline 23. november 2026:

```
Emne: Påminnelse om oppgaven fra Kari

Hei Ola,

Du har sagt ja til å ta deg av «Bestille kake» for Bryllup, med frist 23. november 2026.

Når oppgaven er gjort, eller hvis den ikke lar seg gjøre, kan du gi beskjed her:
http://localhost:3000/h/‹token›?view=accepted

Hilsen Kari, via MasterPlan
```

## Verification

**Commands:**
- `npm test` -- expected: all tests pass, none uses the network
- `npm run typecheck` -- expected: no errors
- `npm run lint` -- expected: no errors

**Manual checks:**
- Docker: `docker build -t masterplan .` and `docker run --rm --env-file .env.example -p 3000:3000 masterplan`, log in as Kari, click **Send påminnelser nå**, see 12 emails, open one reminder link and choose **Ferdig** (AC 8).
- At 360 px wide: the test inbox and the reminder view have no sideways scrolling, and the buttons are easy to tap.
