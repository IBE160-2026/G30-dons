# Epic 3 Context: Reminders keep helpers on track (Must)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Follow-through is the core promise of the product: every task has someone responsible, and nothing is forgotten without someone noticing. This epic sends each helper one fixed-text reminder email per yes, at the right time, for tasks they accepted but have not finished. In test mode every email lands in an in-app test inbox, and the examiner triggers reminders with a button, so the whole flow runs without keys or network, also in the Docker container. The reminder is a must-work item in the brief and is never cut. Changing an answer (Story 3.3) is built right after the reminders. Real email through Gmail (Story 3.2) is only needed for a deployed app and is deferred or cut together with deployment (Story 1.7).

## Stories

- Story 3.1: Reminders and the test inbox
- Story 3.3: Ola changes his answer
- Story 3.2: Real email through the Gmail API (only with deployment, cut together with Story 1.7)

## Requirements & Constraints

- **Timing:** a reminder is due at whichever comes first: 14 days after the helper's most recent yes, or 3 days before the deadline. A yes that comes after the 3-days-before point gets no reminder (the task shows as Urgent instead). Only Accepted tasks get reminders; Done, Can't be done, Declined, Open and Unassigned get none. Unanswered tasks are flagged for the organizer, never reminded.
- **At most once, never lost:** each yes triggers at most one reminder for that task. A late or repeated check sends every due reminder it missed and never sends one twice. A new yes (after changing an answer or reopening) starts a new clock and its own reminder. Deadline edits need no rescheduling.
- **Content:** fixed Norwegian text, respectful and direct, the way a good manager speaks to a team member; no humour, guilt or manipulation. One email per task, never bundled. It names the organizer and the one task, with its date in Norwegian format, and contains a reminder link.
- **Reminder link:** shows only the helper's Accepted tasks, each with Done and Can't be done. Opening it never changes data (chat apps preload links).
- **Test inbox:** in test mode no email leaves the machine. A logged-in organizer sees every email sent on her behalf (recipient, subject, text, links, time), never another organizer's. It is unreachable without login or with test mode off.
- **Send due reminders now:** a test-mode-only control that runs the same check immediately.
- **Docker:** the container, started with `.env.example`, offers the test inbox with no extra setting.
- **Mobile:** helper pages and the reminder link work from 360 px wide, with easy-to-tap buttons.
- Must work with no keys; tests never touch the network.

## Technical Decisions

- **Computed at check time.** `services/reminders.run(now, today)` selects Accepted tasks and asks `domain/reminderDue` whether each is due. No stored schedule.
- **Claim, then send.** For each due task, insert a `reminders_sent` row unique on `(task_id, accepted_at)` first, then call `mail.send`; on failure delete the row so the next run retries. `reminders_sent` cascades from `tasks`.
- **Triggers.** In test mode the **Send påminnelser nå** button calls `run` (Story 3.1). When deployed, `POST /internal/reminders/run` with header `X-Cron-Secret`, compared in constant time, calls the same function; the route exists only when `CRON_SECRET` is set. The route, the setting and the cron-job.org schedule (wake-up GET, then POST twice, safe because the run is idempotent) belong to Story 3.2, since only a deployed app needs them.
- **One mail entry point.** `mail/send({ organizerId, to, subject, text, links, kind })` looks up the organizer itself. All text comes from `mail/texts.ts`; a snapshot test covers the reminder text. Sender name "MasterPlan på vegne av ‹organizer›", `Reply-To` the organizer's email. A failed send throws `MailError`.
- **Test mode** writes to `outbox_emails` (`organizer_id`, `to`, `from_name`, `reply_to`, `subject`, `text`, `links` JSON, `kind`, `created_at`). `MAIL_TRANSPORT=disabled` writes nothing, logs one line, and reminders are not sent. `gmail` belongs to Story 3.2.
- **Time:** only `clock.now()`/`clock.today()` (Oslo date); all day arithmetic through `domain/dates.ts`. Tests use a fixed clock.
- **Config:** read once in `config.ts`. `CRON_SECRET` is added with the cron route in Story 3.2.
- **Migrations:** one committed `drizzle-kit generate` migration per schema change; `reminders_sent` and `outbox_emails` arrive in Story 3.1.
- **Layers:** routes → services → domain; mail and other side effects outside transactions; one console line per reminder run and per send failure.
- Story 3.3 reuses the helper state machine and `tasks.apply`; a yes after a no sets a new `accepted_at`, which the reminder log treats as a new yes.

## UX & Interaction Patterns

- Norwegian UI text written in the EJS views; existing flash (`role="status"`), muted text and button styles; no inline JavaScript.
- Counted text uses the singular for one ("1 påminnelse").
- Empty states say what to do next.

## Cross-Story Dependencies

- 3.1 builds on Epic 1: helper links and tokens (1.3), the helper page and state machine (1.4), the seed data (1.6) and the Docker image (1.6). The seed's Accepted tasks give the examiner reminders to send on day one.
- 3.3 needs 3.1's reminder log to prove that a new yes gets its own reminder.
- 3.2 needs 3.1's mail boundary and `reminders.run`, adds the cron route and `CRON_SECRET`, and is only useful with deployment (1.7).
- Story 4.1 (send helper links by email) reuses the mail boundary and test inbox; Story 4.2 adds the other test-mode controls next to the reminder button.
