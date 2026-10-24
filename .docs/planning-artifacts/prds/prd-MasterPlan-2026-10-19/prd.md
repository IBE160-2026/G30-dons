---
title: "PRD: MasterPlan"
status: draft
created: 2026-10-19
updated: 2026-10-24
---

# PRD: MasterPlan

## 0. Document Purpose

This PRD defines version 1 of MasterPlan for the IBE160 course project (solo, due November 2026). It builds on the product brief (`.docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/brief.md`) and the teacher's feedback on it. The PRD is journey-led: four user journeys (UJ-1 to UJ-4) describe the product, the Glossary fixes the vocabulary, and features carry globally numbered functional requirements (FR-1 to FR-N), each with testable consequences. Design and technology detail lives in `addendum.md`. Inline `[ASSUMPTION: …]` tags mark points inferred without confirmation.

## 1. Vision

MasterPlan is a web app for people who have to organize a big private event without being planners, such as a wedding or a bachelorette party. Its promise: **every task has someone responsible for it, and nothing is forgotten without someone noticing.** The AI drafts the plan, the organizer assigns each task to a helper, helpers answer from a link without logging in, email reminders keep them on track, and the organizer sees what is stuck early enough to fix it.

## 2. Users

- **Organizer:** a private individual in charge of one or more events, working on a desktop browser with a login.
- **Helper:** a friend or family member identified by email, using a phone browser, with no login in v1.
- **Examiner:** runs the app locally in test mode to assess it.

**Not for v1:** professional planners, everyday task management, native mobile apps.

## 3. User Journeys

### UJ-1: Kari sets up both events and sends out the tasks

*Organizer, desktop web.*

Kari is the maid of honor, planning both the wedding and the bachelorette party. She is overwhelmed and needs one common place to send out tasks and see how both events are going. She has heard MasterPlan is good for staying organized through big events.

1. Kari creates an account and logs in on her laptop.
2. She creates two events from the **Wedding** and **Bachelorette party** templates.
3. For each event she fills in the template fields: what, where, when, how many guests, what needs to be done, and other information.
4. The AI drafts a task list with deadlines (the event's overview and timeline). If the AI fails or returns an invalid plan, the template's default plan is used and Kari is told.
5. Kari reviews the draft and adds, changes or deletes tasks.
6. She enters her helpers' email addresses (up to five per event) and assigns each task to a specific helper.
7. For each helper she either sends the link by email from MasterPlan or copies it and pastes it into a chat.
8. **Outcome:** both events are planned and every task has been sent to a named helper. The session ends here.

### UJ-2: Ola answers his tasks and reports back

*Helper, phone, no login.*

Ola is the best man and helps with both events. Kari copies his link and sends it to him on Messenger.

1. Ola taps the link and the MasterPlan web page opens, with no account needed. The header reads: *"Kari has invited you to organize Wedding and Bachelorette Party with MasterPlan!"*
2. The page lists all of his tasks across both events. Each task reads *"Kari wants you to buy napkins and straws by [date]"* and has **Yes / No** buttons and a box for a message to Kari.
3. Ola answers each task, sometimes adding a message. Kari's overview updates at once.
4. If Ola buys the napkins the next day, he marks the task **Done** from the same page.
5. For tasks he accepted but has not finished, Ola gets a reminder email at whichever comes first: 14 days after his yes, or 3 days before the task's deadline. The email contains a link that shows only his accepted, unfinished tasks.
6. For each of those tasks he chooses **Done** or **Can't be done**, with an optional message. Kari's overview updates at once.
7. **Outcome:** Kari can see, task by task, what is done and what is in trouble, early enough to reassign. If Ola had not answered at all within 7 days, his tasks would be flagged on Kari's page for her to follow up. He would get no automatic reminder.

### UJ-3: Kari checks progress and fixes what is stuck

*Organizer, desktop web, returning session a few weeks later.*

1. Kari logs in. The first page summarizes both events so she can see which needs attention: *Wedding: 2 urgent · Bachelorette party: all on track.*
2. She opens the **Wedding** tab. An information box shows the date, guest count and general information. Beside it are collapsible panels, each with a one-line summary: *12 of 30 done*, *3 urgent, 2 needs a helper*, *38 days to go, next due Friday*, *2 new replies*.
3. She expands **To do** and sees the two tasks that need a helper. One was declined; one Ola marked **Can't be done**, with a message explaining why.
4. She reassigns the first task to another helper and sends the link by email or copies it into a chat. She handles the second herself and marks it **Done**. The reassigned task disappears from the original helper's page.
5. She reads the new replies in the **Messages** panel.
6. **Outcome:** nothing on the wedding is stuck without Kari knowing. Every open task has a helper or is done, and she can see what is due next.

### UJ-4: John, the examiner, runs MasterPlan in test mode

*Examiner, own computer, no project keys, paid accounts or internet-dependent services.*

1. John follows the README Quick Start: clone the repo, install, copy `.env.example`, seed the database, start the app, open it in the browser. It starts on the first try.
2. He logs in with the test organizer from the README. The first page shows two seeded events with overlapping helpers: *Bachelorette party: on track · Wedding: urgent, needs attention.* Seeded dates are relative to the day he runs the seed, so the statuses always hold.
3. He opens each event tab and sees tasks in every status and helpers who work on both events.
4. He clicks **View as helper**, and the helper's page opens in a new tab. He also pastes a seeded helper link into a private window, answers a task, and sees the organizer overview update.
5. He creates a new event from a template. With no AI key, he gets a fixed mock plan and a notice that the app is in test mode. He switches on the **simulated AI failure** and sees the template fallback and its notice.
6. He clicks **Send due reminders now** (test mode only) and reads the resulting reminder on the **test inbox** page. This page, shown only in test mode, lists every email the app would have sent.
7. He runs the full automated test suite with one command and gets a clear pass/fail summary. The tests use their own database, mock AI and no real email, and need no network.
8. **Outcome:** within a few minutes John has seen the whole core loop working. He can also check each FR against its tests in the traceability table.

## 4. Glossary

All later sections use these terms exactly.

- **Organizer:** the logged-in user who owns events, creates tasks and assigns them. Owns 0..n events.
- **Helper:** a person identified by an email address who is assigned tasks. An event has at most five helpers. The same helper (same email) can work on several events of one organizer.
- **Event:** an occasion the organizer plans, such as a wedding. Created from one template. Has a date, a location, a guest count, general information and 0..n tasks.
- **Template:** a predefined event type (v1: **Wedding**, **Bachelorette party**) with input fields and a default plan.
- **Plan draft:** the list of tasks with deadlines that the AI proposes for an event. If the AI fails, the template's default plan takes its place.
- **Task:** one piece of work in an event, with a title, a deadline, at most one assigned helper, a status and 0..n messages.
- **Helper link:** a unique, unguessable URL, one per helper per organizer, that shows that helper all their tasks across the organizer's events, with no login.
- **Answer:** a helper's response to a task: yes or no to start with, then Done or Can't be done.
- **Message:** optional free text a helper attaches to an answer, visible to the organizer.
- **Task status:** exactly one of:
  - **Open:** assigned, not yet answered.
  - **Accepted:** the helper said yes.
  - **Declined:** the helper said no.
  - **Done:** finished. Set by the helper or the organizer.
  - **Can't be done:** the helper accepted but reports they cannot finish it.
- **Urgent:** an Accepted task that is due within 3 days or past its deadline.
- **Needs a helper:** a task that is Declined, Can't be done, or has been Open for 7 days or more.
- **On track:** an event with no Urgent tasks and no tasks that Need a helper.
- **Reminder:** a fixed-text email to a helper about their Accepted tasks, containing a reminder link.
- **Reminder link:** a link that shows the helper only their Accepted tasks.
- **Overview:** the organizer's first page, with one summary per event.
- **Event view:** the organizer's page for one event (one tab per event), with an information box and summary panels.
- **New reply:** an answer or message the organizer has not yet seen.
- **Test mode:** a way of running the app without project keys, paid accounts or real email, for examiners and automated tests.
- **Test inbox:** a page, available only in test mode, that lists every email the app would have sent.
- **Seed data:** the ready-made test organizer, events, helpers and tasks loaded by the seed command.

## 5. Features

### 5.1 Organizer account

**Description:** the organizer creates an account and logs in to reach her events. Realizes UJ-1, UJ-3.

#### FR-1: Create account and log in
The organizer can create an account with an email address and a password, and log in and out.
- Logging in with a wrong password fails, and the error message does not say whether the email exists.
- Pages for the overview, event views and editing are not reachable without logging in.

#### FR-2: Organizer data isolation
An organizer can see and change only her own events, tasks and helpers.
- When organizer A requests organizer B's event, by ID or by URL, access is refused.

### 5.2 Events from templates

**Description:** the organizer creates an event by choosing a template and filling in its fields. She can run several events at once. Realizes UJ-1.

#### FR-3: Create an event from a template
The organizer can create an event from the **Wedding** or **Bachelorette party** template by entering what, where, when (the event date), how many guests, what needs to be done, and other information.
- An event cannot be created without an event date.
- After creation, the event appears on the overview and has its own event view.

#### FR-4: Several events at once
The organizer can have several events active at the same time.
- With two events created, the overview shows two summaries, and each event has its own tab.

### 5.3 AI-drafted plan

**Description:** after the organizer fills in the template, the AI drafts a task list with deadlines. The organizer edits it freely. If the AI fails, the template's default plan is used. This is the only AI step in v1. Realizes UJ-1, UJ-4.

#### FR-5: Draft a plan with AI
The system can produce a plan draft for an event from the template fields: a list of tasks, each with a title and a deadline.
- Every drafted task has a title and a deadline on or before the event date.

#### FR-6: Template fallback
If the AI call fails, times out or returns an invalid plan, the system uses the template's default plan and tells the organizer.
- A plan is invalid if it contains no tasks, a task without a title, a task without a valid deadline, or a task with a deadline after the event date.
- When the AI is forced to fail (the test-mode simulated failure or a mocked error), the event is created with the default plan and a visible notice.

#### FR-7: Edit the plan
The organizer can add, change and delete any task, and change its title and deadline, at any time.
- Every task in a plan draft can be edited and deleted, and new tasks can be added.

### 5.4 Helpers and assignment

**Description:** the organizer adds helpers by email and assigns each task to one helper. She shares each helper's link by email from the app or copies it into a chat. Realizes UJ-1, UJ-3.

#### FR-8: Add helpers by email
The organizer can add up to five helpers to an event by email address. A helper already added to another of her events is the same helper.
- Adding a sixth helper to an event is refused.
- Adding the same email to two events gives one helper with tasks in both events.

#### FR-9: Assign a task to a helper
The organizer can assign each task to exactly one of the event's helpers. A newly assigned task is Open.

#### FR-10: Share the helper link
For each helper, the organizer can send the helper link by email from the app, or copy it to paste into a chat.
- Sending creates one email to the helper's address that contains the helper link.
- Copying puts the full helper link on the clipboard.

#### FR-11: Reassign a task
The organizer can reassign a task to another helper. The task becomes Open for the new helper and disappears from the original helper's page.
- After reassignment, the original helper's link no longer shows the task, and the new helper's link shows it as Open.

### 5.5 Helper page

**Description:** the helper opens their link on a phone, without logging in, and sees all their tasks from this organizer's events. They answer yes or no, then report Done or Can't be done. Each answer can carry a message. Realizes UJ-2.

#### FR-12: Link access
Anyone with a helper link can open that helper's page without logging in. The page shows only that helper's tasks.
- A helper link shows the tasks of that helper and no others.
- A changed, random or malformed link shows no tasks and reveals no data.
- The link token has at least 128 bits of randomness.

#### FR-13: Answer yes or no
On an Open task, the helper can answer yes (task becomes Accepted) or no (task becomes Declined), with an optional message.
- After an answer, the event view shows the new status and the message, and counts it as a New reply.

#### FR-14: Change the answer
The helper can change Accepted to Declined, or Declined to Accepted.
- After a change, the event view shows the new status.

#### FR-15: Report Done or Can't be done
On an Accepted task, from the helper link or the reminder link, the helper can choose Done or Can't be done, with an optional message.
- After the report, the event view shows the new status and the message.

#### FR-16: Organizer marks Done
The organizer can mark any task Done herself.

### 5.6 Reminders

**Description:** the system emails a fixed-text reminder to helpers about Accepted tasks that are not finished, early enough for the organizer to react. Unanswered tasks get no reminder. Instead they are flagged for the organizer. Realizes UJ-2, UJ-4.

#### FR-17: Reminder timing
For each Accepted task, the system sends a reminder at whichever comes first: 14 days after the helper said yes, or 3 days before the deadline.
- A task accepted 20 days before its deadline gets its reminder on day 14 after the yes.
- A task accepted 10 days before its deadline gets its reminder 3 days before the deadline.
- A task that is Done, Can't be done, Declined or Open gets no reminder.
- Each task triggers at most one reminder, and each reminder is its own email. Several tasks are never bundled into one email.
- The system checks for due reminders at least once a day. In test mode, **Send due reminders now** runs the check immediately (FR-26).

#### FR-18: Reminder content
A reminder uses a fixed, respectful text ("Reminder to fix the task given by [organizer name]"), names the one task it covers, and contains the reminder link.
- The reminder link shows only the helper's Accepted tasks, each with Done and Can't be done choices.

### 5.7 Overview and event view

**Description:** the organizer's first page shows which event needs attention. Each event has a view with its key facts and the state of its tasks. Everything updates as helpers answer. Realizes UJ-3.

#### FR-19: Overview across events
The overview shows one summary per event: On track, or the number of Urgent tasks and of tasks that Need a helper.
- Given the seed data, the overview shows the Bachelorette party as On track and the Wedding as having Urgent tasks.

#### FR-20: Event view summaries
The event view shows the event date, guest count and general information, plus these summaries:
- **Done:** "N of M done".
- **To do:** the number of Urgent tasks and of tasks that Need a helper, with each task listed.
- **Timeline:** days until the event and the next deadline.
- **Messages:** the number of New replies, with each reply listed.

Consequences:
- Given a fixed set of test events, each summary shows the expected counts.

#### FR-21: Status rules
The system derives task states exactly as defined in the Glossary.
- Urgent, Needs a helper and On track are recalculated against the current date every time a page is shown.
- An Open task assigned 7 days ago or more counts as Needs a helper. The 7 days are counted from the time the task was assigned.

#### FR-22: Live updates
After any answer, report or edit, the overview and the event view show the new state the next time they load.
- Pages are correct on every load. Real-time push is not required.

## 6. Test Mode

Test mode lets the examiner, and the automated tests, run MasterPlan locally from the README without the project's keys, paid accounts or any outside service. Realizes UJ-4.

#### FR-23: Run without keys
When no language-model key is configured, the app runs in test mode. Test mode can also be switched on with a setting in `.env`.
- The plan draft uses a fixed mock plan, and the UI shows that the app is in test mode.
- No email leaves the machine. Every email goes to the test inbox.

#### FR-24: Test inbox
In test mode, a test inbox page lists every email the app would have sent, with recipient, subject, body, links and time.
- The test inbox cannot be reached when test mode is off.

#### FR-25: Seed data
A single seed command loads a test organizer (login shown in the README) and two events, a Wedding and a Bachelorette party, that share helpers. Between them the tasks cover every Task status, plus Urgent and Needs a helper.
- All seeded dates are relative to the day the seed runs.
- Straight after seeding, the overview shows the Bachelorette party as On track and the Wedding as having Urgent tasks.

#### FR-26: Test-mode controls
In test mode, the organizer UI also offers:
- **View as helper:** opens a helper's page in a new tab.
- **Seeded helper links:** listed, so they can be opened in a private window.
- **Send due reminders now:** runs the reminder check (FR-17) immediately.
- **Simulate AI failure:** a toggle that forces the template fallback (FR-6).

Consequences:
- None of these controls appear when test mode is off.

#### FR-27: Automated tests
One command (`npm test`, documented in the README) runs the full automated test suite.
- The tests run in test mode with mock AI and no email sending.
- They need no API keys, paid accounts or internet connection.
- They use their own database and never change the seed data.
- They end with a clear pass/fail summary.

#### FR-28: Setup and documentation
- `.env.example` lists every setting with a safe default.
- API keys and email credentials are never committed to the repository.
- The README contains a Quick Start, the test login, a "Things to try" list that walks through the core loop, and "Known limitations" (for example: the mock AI ignores the event description).
- A traceability table in the docs maps every FR to its automated test or tests.
- The docs include a short cost-and-mock plan for the language model and email, written in the architecture step.

## 7. Non-Functional Requirements

- **NFR-1 Mobile helper page:** the helper page and the reminder link work on a phone screen from 360 px wide with no sideways scrolling, and every button is easy to tap.
- **NFR-2 Security:** helper links follow FR-12. Passwords are stored only as salted hashes. Organizer pages require login (FR-1, FR-2).
- **NFR-3 Privacy:** the app stores only what the core loop needs: organizer account, event fields, helper emails, tasks and messages. Helper emails are never sent to the AI. Only the template fields are.
- **NFR-4 Zero running costs:** v1 costs nothing to run. Any language model or email service must be free to use at course-project volume, and everything works without them in test mode.
- **NFR-5 Simplicity:** one web app with one database. Reminders use the simplest scheduler that meets FR-17.
- **NFR-6 AI response time:** if the plan draft takes too long, the template fallback is used (FR-6). [ASSUMPTION: the limit is 30 seconds.]

## 8. Scope

**Version 1 (FR-1 to FR-28),** built in this order, each step stable before the next:
1. Organizer account.
2. Events from templates.
3. AI-drafted plan with template fallback.
4. Helpers, assignment and the helper page.
5. Overview and event view.
6. Fixed-text reminders.

Test mode (FR-23 to FR-28) is built alongside each step.

**Stage 2, in priority order:** evaluations with an AI summary; a minimum anonymized experience bank; helper login; calendar export (.ics); guest list with idea suggestions and comments; AI-written reminders, clearly marked as written by AI.

**Out of scope:** native mobile app, professional planners, everyday task management, budget, cost-splitting and RSVP, voting and visual boards, SMS reminders, two-way chat integration, paid services of any kind.

## 9. Success Metrics

**Functional.** Every FR has at least one automated test in the traceability table, and `npm test` passes. This covers the brief's eight functional criteria.

**Product.** 2–3 friends act as helpers in a realistic test event before the deadline:
- **SM-1:** no task is silently forgotten. Every task ends Done, Declined or Can't be done, and each of these is visible to the organizer.
- **SM-2:** at least 80% of tasks get a yes or no within 3 days.
- **SM-3:** at least 80% of Accepted tasks are Done by their deadline.
- **SM-4:** the organizer only adjusts the AI plan draft. She does not rewrite it.
- **SM-5:** helpers find the reminders helpful, not annoying.

**Counter-metrics** (signs that something is going wrong):
- **CM-1:** the organizer deletes or rewrites more than half of the drafted tasks, so the AI is not saving her work.
- **CM-2:** a task first shows as Needs a helper within 3 days of its deadline, too late to reassign.
- **CM-3:** a helper asks to stop getting reminders.

## 10. Open Questions

1. **Free AI and email services:** which language model and email service meet NFR-4 at zero cost? To be decided in the architecture step.
2. **Hosting:** does v1 only ever run locally, or is it also deployed, still at zero cost?
3. **Helper names:** helpers are identified by email. Does the organizer also enter a name to show on her pages, such as "Ola"?
4. **Undo:** can a helper change Done or Can't be done afterwards?
5. **Deleting:** can the organizer delete an event or remove a helper, and what happens to that helper's tasks?
6. **UI language:** English, Norwegian, or both?
