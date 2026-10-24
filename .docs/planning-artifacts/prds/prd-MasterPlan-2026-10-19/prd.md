---
title: "PRD: MasterPlan"
status: draft
created: 2026-10-19
updated: 2026-10-24
---

# PRD: MasterPlan

## 0. Document Purpose

This PRD defines version 1 of MasterPlan for the IBE160 course project (solo, due 14 November 2026). It builds on the product brief (`.docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/brief.md`) and the teacher's feedback on it. The PRD is journey-led: four user journeys (UJ-1 to UJ-4) describe the product, the Glossary fixes the vocabulary, and features carry globally numbered functional requirements (FR-1 to FR-32), each with testable consequences and a priority: **Must** (the core loop the friends test needs) or **Should** (built if time allows, cut in the order given in §8). Design and technology detail lives in `addendum.md`. Inline `[ASSUMPTION: …]` tags mark points inferred without confirmation.

## 1. Vision

MasterPlan is a web app for people who have to organize a big private event without being planners, such as a wedding or a bachelorette party. Its promise: **every task has someone responsible for it, and nothing is forgotten without someone noticing.** The AI drafts the plan, the organizer assigns each task to a helper, helpers answer from a link without logging in, email reminders keep them on track, and the organizer sees what is stuck early enough to fix it.

Today these events run on group chats and memory, and **nobody follows up**. Helpers forget, and the organizer finds out too late. General task tools assume the user is a planner, but the organizer "doesn't want a project-management tool". MasterPlan gives her a starting plan rather than a blank board, and a way to make others follow through. It has no technical moat. Its advantage is a clear focus on one user and one problem.

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

1. Ola taps the link and the MasterPlan web page opens, with no account needed. The header reads: *"Kari has invited you to organize Wedding and Bachelorette party with MasterPlan!"*
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

- **Organizer:** the logged-in user who owns events, creates tasks and assigns them. Has a name and an email address. Owns 0..n events.
- **Helper:** a person identified by an email address who is assigned tasks. An event has at most five helpers. The same helper (same email) can work on several events of one organizer.
- **Event:** an occasion the organizer plans, such as a wedding. Created from one template. Has a name, a date, a location, a guest count, general information and 0..n tasks.
- **Template:** a predefined event type (v1: **Wedding**, **Bachelorette party**) with input fields and a default plan.
- **Plan draft:** the list of tasks with deadlines that the AI proposes for an event. If the AI fails, the template's default plan takes its place.
- **Task:** one piece of work in an event, with a title, a deadline, at most one assigned helper, a status and 0..n messages.
- **Date:** event dates and deadlines are calendar dates without a time. Days are counted in Norwegian time (Europe/Oslo). "Due within 3 days" means the deadline is today or one of the next 3 days. "Past its deadline" means the deadline is before today.
- **Helper link:** a unique, unguessable URL, one per helper per organizer, that opens the helper page.
- **Helper page:** the page a helper link opens. It shows that helper all their tasks across the organizer's events, with no login.
- **Answer:** a helper's response to a task: yes or no to start with, then Done or Can't be done.
- **Message:** optional free text a helper attaches to an answer, visible to the organizer.
- **Task status:** exactly one of:
  - **Unassigned:** no helper. This is every task's status when it is first drafted or added, and after its helper is removed.
  - **Open:** assigned, not yet answered.
  - **Accepted:** the helper said yes.
  - **Declined:** the helper said no.
  - **Done:** finished. Set by the helper or the organizer.
  - **Can't be done:** the helper accepted but reports they cannot finish it.
- **Urgent:** an Accepted task that is due within 3 days or past its deadline.
- **Needs a helper:** a task that is Unassigned, Declined or Can't be done, or that is Open and either was assigned 7 or more days ago or is due within 3 days.
- **On track:** an event with no Urgent tasks and no tasks in Needs a helper.
- **Reminder:** a fixed-text email to a helper about one Accepted task, containing a reminder link.
- **Reminder link:** a link that shows the helper only their Accepted tasks.
- **Overview:** the organizer's first page, with one summary per event.
- **Event view:** the organizer's page for one event (one tab per event), with an information box and summary panels.
- **New reply:** an answer, changed answer or message that the organizer has not yet seen. It counts as seen once she opens the Messages panel of that event.
- **Mock AI:** a fixed plan used instead of the language model when no AI key is configured.
- **Test mode:** a setting (on in `.env.example`) under which no email leaves the machine and the test inbox and test-mode controls are available. Used by examiners and automated tests.
- **Test inbox:** a page, available only in test mode and only to a logged-in organizer, that lists every email the app would have sent on her behalf.
- **Seed data:** the ready-made test organizer, events, helpers and tasks loaded by the seed command.

## 5. Features

### 5.1 Organizer account

**Description:** the organizer creates an account and logs in to reach her events. Realizes UJ-1, UJ-3.

#### FR-1: Create account and log in · Must
The organizer can create an account with her name, an email address and a password, and log in and out.
- Logging in with a wrong password fails, and the error message does not say whether the email exists.
- Pages for the overview, event views and editing are not reachable without logging in.
- Her name is the one shown to helpers ("Kari has invited you…") and in reminders.

#### FR-2: Organizer data isolation · Must
An organizer can see and change only her own events, tasks and helpers.
- When organizer A requests organizer B's event, by ID or by URL, access is refused.

### 5.2 Events from templates

**Description:** the organizer creates an event by choosing a template and filling in its fields. She can run several events at once. Realizes UJ-1.

#### FR-3: Create an event from a template · Must
The organizer can create an event from the **Wedding** or **Bachelorette party** template by entering a name (defaulting to the template name), what, where, when (the event date), how many guests, what needs to be done, and other information.
- An event cannot be created without an event date, or with an event date in the past.
- After creation, the event appears on the overview and has its own event view.

#### FR-4: Several events at once · Must
The organizer can have several events active at the same time.
- With two events created, each event has its own tab.

#### FR-29: Edit event fields · Should
The organizer can change any event field after creation.
- The event date cannot be changed to a date in the past.
- Changing the event date does not move task deadlines.

#### FR-32: Delete an event · Should
The organizer can delete an event. Its tasks and messages are deleted with it.
- After deletion, the event's tasks no longer appear on any helper page.

### 5.3 AI-drafted plan

**Description:** after the organizer fills in the template, the AI drafts a task list with deadlines. The organizer edits it freely. If the AI fails, the template's default plan is used. This is the only AI step in v1. Realizes UJ-1, UJ-4.

#### FR-5: Draft a plan with AI · Must
The system can produce a plan draft for an event from the template fields: a list of tasks, each with a title and a deadline. Drafted tasks are Unassigned.
- Every drafted task has a title and a deadline on or before the event date.
- Any deadline earlier than today is set to today. This applies to AI plans and template plans alike, and does not make a plan invalid.

#### FR-6: Template fallback · Must
If the AI call fails, times out or returns an invalid plan, the system uses the template's default plan and tells the organizer.
- A plan is invalid if it contains no tasks, a task without a title, a task without a valid deadline, or a task with a deadline after the event date.
- When the AI is forced to fail (the test-mode simulated failure or a mocked error), the event is created with the default plan and a visible notice.

#### FR-7: Edit the plan · Must
The organizer can add, change and delete any task, and change its title and deadline, at any time.
- Every task in a plan draft can be edited and deleted, and new tasks can be added as Unassigned.
- If a deadline changes, a reminder for that task that has not yet been sent is rescheduled (FR-17).

### 5.4 Helpers and assignment

**Description:** the organizer adds helpers by email and assigns each task to one helper. She shares each helper's link by copying it into a chat, or by email from the app. Realizes UJ-1, UJ-3.

#### FR-8: Add helpers by email · Must
The organizer can add up to five helpers to an event by email address. A helper already added to another of her events is the same helper.
- Adding a sixth helper to an event is refused.
- Adding the same email to two events gives one helper with tasks in both events.

#### FR-9: Assign a task to a helper · Must
The organizer can assign an Unassigned task to exactly one of the event's helpers. The task becomes Open.

#### FR-10: Share the helper link · Must (copy) / Should (email)
For each helper, the organizer can copy the helper link to paste into a chat (Must), or send it by email from the app (Should).
- Copying puts the full helper link on the clipboard.
- Sending creates one email to the helper's address that contains the helper link.

#### FR-11: Reassign a task · Must
The organizer can reassign a task to another helper. The task becomes Open for the new helper and disappears from the original helper's page.
- After reassignment, the original helper's link no longer shows the task, and the new helper's link shows it as Open.

#### FR-30: Correct or remove a helper · Should
The organizer can correct a helper's email address or remove a helper from an event.
- Correcting the email creates a new helper link. The old link stops working.
- Removing a helper makes that helper's tasks in the event Unassigned, and they disappear from the helper's page.

### 5.5 Helper page

**Description:** the helper opens their link on a phone, without logging in, and sees all their tasks from this organizer's events. They answer yes or no, then report Done or Can't be done. Each answer can carry a message. Realizes UJ-2.

#### FR-12: Link access · Must
Anyone with a helper link can open the helper page without logging in. The page shows only that helper's tasks.
- A helper link shows the tasks of that helper and no others.
- A changed, random or malformed link shows no tasks and reveals no data.
- The link token has at least 128 bits of randomness.
- The reminder link follows the same rules.
- Opening a helper link or reminder link never changes any data. Only an explicit choice by the helper does. Chat apps load links in the background to build previews.
- The server accepts a change only from the task's current helper and only if the change is allowed from the task's current status. A change sent from a stale page, for example after a reassignment, is refused.

#### FR-13: Answer yes or no · Must
On an Open task, the helper can answer yes (task becomes Accepted) or no (task becomes Declined), with an optional message.
- After an answer, the event view shows the new status and the message, and counts it as a New reply.

#### FR-14: Change the answer · Should
The helper can change Accepted to Declined, or Declined to Accepted.
- After a change, the event view shows the new status and counts it as a New reply.
- Changing to Accepted restarts the 14-day reminder clock from the new yes (FR-17).

#### FR-15: Report Done or Can't be done · Must
On an Accepted task, from the helper page or the reminder link, the helper can choose Done or Can't be done, with an optional message.
- After the report, the event view shows the new status and the message.

#### FR-16: Organizer marks Done · Must
The organizer can mark any task Done herself.

#### FR-31: Undo and reopen · Should
The helper can switch a task between Done and Can't be done. The organizer can reopen any task, for the same helper or another one, and it becomes Open.
- A reopened task follows FR-13 again, including a new reminder clock after the next yes.

### 5.6 Reminders

**Description:** the system emails a fixed-text reminder to helpers about Accepted tasks that are not finished, early enough for the organizer to react. Unanswered tasks get no reminder. Instead they are flagged for the organizer. Realizes UJ-2, UJ-4.

#### FR-17: Reminder timing · Should
For each Accepted task, the system sends a reminder at whichever comes first: 14 days after the helper's most recent yes, or 3 days before the deadline.
- A task accepted 20 days before its deadline gets its reminder on day 14 after the yes.
- A task accepted 10 days before its deadline gets its reminder 3 days before the deadline.
- A task accepted when the 3-days-before point has already passed gets no reminder. It shows as Urgent on the organizer's page.
- A task that is Done, Can't be done, Declined, Open or Unassigned gets no reminder.
- Each yes triggers at most one reminder for that task, and each reminder is its own email. Several tasks are never bundled into one email.
- If a reminder check runs late, it sends every reminder that is due and never sends the same reminder twice.
- The system checks for due reminders at least once a day. In test mode, **Send due reminders now** runs the check immediately (FR-26).

#### FR-18: Reminder content · Should
A reminder uses a fixed, respectful text ("Reminder to fix the task given by [organizer name]"), names the one task it covers, and contains the reminder link.
- The reminder link shows only the helper's Accepted tasks, each with Done and Can't be done choices.
- The sender is shown as "MasterPlan on behalf of [organizer name]", and replies go to the organizer's email address.
- The text is respectful and direct (NFR-7).

### 5.7 Overview and event view

**Description:** the organizer's first page shows which event needs attention. Each event has a view with its key facts and the state of its tasks. Everything updates as helpers answer. Realizes UJ-3.

#### FR-19: Overview across events · Should
The overview shows one summary per event: On track, or the number of Urgent tasks and of tasks in Needs a helper.
- Given the seed data, the overview shows the Bachelorette party as On track and the Wedding as having Urgent tasks.
- If this FR is cut, the organizer's first page is the list of event tabs.

#### FR-20: Event view summaries · Must
The event view shows the event name, date, guest count and general information, plus these summaries:
- **Done:** "N of M done".
- **To do:** the number of Urgent tasks and of tasks in Needs a helper, with each task listed.
- **Timeline:** days until the event and the next deadline.
- **Messages:** the number of New replies, with each reply listed.

Consequences:
- Given the seed data, each summary shows the counts listed in the fixture table (FR-25).

#### FR-21: Status rules · Must
The system derives task states exactly as defined in the Glossary.
- Urgent, Needs a helper and On track are recalculated against the current date every time a page is shown.
- An Open task assigned 7 days ago or more counts as Needs a helper. The 7 days are counted from the time the task was assigned.
- An Open task due within 3 days counts as Needs a helper, however recently it was assigned.
- An Unassigned task always counts as Needs a helper, so an event with Unassigned tasks is never On track.

#### FR-22: Live updates · Must
After any answer, report or edit, the overview and the event view show the new state the next time they load.
- Pages are correct on every load. Real-time push is not required.

## 6. Test Mode

Test mode lets the examiner, and the automated tests, run MasterPlan locally from the README without the project's keys, paid accounts or any outside service. Realizes UJ-4.

#### FR-23: Run without keys · Must
- When no language-model key is configured, the app uses the mock AI for plan drafts and shows that it does. This is independent of test mode.
- When test mode is on, no email leaves the machine. Every email goes to the test inbox.
- Test mode is switched on by a setting in `.env`, and it is on in `.env.example`.

#### FR-24: Test inbox · Should
In test mode, a logged-in organizer can open a test inbox page that lists every email the app would have sent on her behalf, with recipient, subject, body, links and time.
- The test inbox cannot be reached when test mode is off, or without logging in.
- An organizer never sees another organizer's emails.

#### FR-25: Seed data · Must
A single seed command loads a test organizer (login shown in the README) and two events, a Wedding and a Bachelorette party, that share helpers. Between them the tasks cover every Task status, plus Urgent and Needs a helper.
- All seeded dates are relative to the day the seed runs.
- A fixture table in the docs lists, for each seeded event, the expected number of tasks in each Task status and the expected counts for Urgent, Needs a helper and Done.
- Straight after seeding, the Bachelorette party is On track and the Wedding has Urgent tasks.
- The README lists the seeded helper links.

#### FR-26: Test-mode controls · Should
In test mode, the logged-in organizer also gets:
- **View as helper:** opens a helper's page in a new tab.
- **Seeded helper links:** listed, so they can be opened in a private window.
- **Send due reminders now:** runs the reminder check (FR-17) immediately.
- **Simulate AI failure:** a toggle that forces the template fallback (FR-6).

Consequences:
- None of these controls appear when test mode is off.

#### FR-27: Automated tests · Must
One command (`npm test`, documented in the README) runs the full automated test suite.
- The tests run in test mode with mock AI and no email sending.
- They need no API keys, paid accounts or internet connection.
- They use their own database and never change the seed data.
- They use a fixed date, so the date rules give the same result on any day.
- They end with a clear pass/fail summary.

#### FR-28: Setup and documentation · Must
- `.env.example` lists every setting with a safe default, including the base URL used in helper and reminder links.
- API keys and email credentials are never committed to the repository, and `.env` is listed in `.gitignore`.
- The README contains a Quick Start, the test login, a "Things to try" list that walks through the core loop, and "Known limitations" (for example: the mock AI ignores the event description).
- A traceability table in the docs maps every FR to its automated test or tests.
- The docs include a short cost-and-mock plan for the language model and email, written in the architecture step.

## 7. Non-Functional Requirements

- **NFR-1 Mobile helper page:** the helper page and the reminder link work on a phone screen from 360 px wide with no sideways scrolling, and every button is easy to tap.
- **NFR-2 Security:** helper links follow FR-12. Passwords are stored only as salted hashes. Organizer pages require login (FR-1, FR-2).
- **NFR-3 Privacy:** the app stores only what the core loop needs: organizer account, event fields, helper emails, tasks and messages. Helper emails are never sent to the AI. Only the template fields are.
- **NFR-4 Zero running costs:** v1 costs nothing to run. Any hosting, language model or email service must be free at course-project volume, and everything works without them in test mode.
- **NFR-5 Simplicity:** one web app with one database. Reminders use the simplest scheduler that meets FR-17.
- **NFR-6 AI response time:** if the plan draft takes too long, the template fallback is used (FR-6). [ASSUMPTION: the limit is 30 seconds.]
- **NFR-7 Respect:** reminders are respectful and direct, the way a good manager speaks to a team member. They never manipulate or guilt-trip, and they use no humor, which could read as passive-aggressive. The organizer can edit or override every plan draft (FR-7).
- **NFR-8 Deployable for the friends test:** the app can be deployed to a free hosting service so that helpers can open links on their phones. With test mode off, it sends real email through a free email service. The specific services are chosen in the architecture step.

## 8. Scope

**Deadline: 14 November 2026.**

**Must (the core loop for the friends test):** FR-1 to FR-9, FR-10 (copy link), FR-11 to FR-13, FR-15, FR-16, FR-20 to FR-23, FR-25, FR-27, FR-28. With only these, Kari can plan an event with the AI, assign tasks, paste links into a chat, and see answers, Done, Can't be done and Needs a helper on her event view. The examiner can run it without keys.

**Should, built in this order if time allows:**
1. Reminders (FR-17, FR-18) with the test inbox (FR-24).
2. Send the helper link by email (FR-10, email part).
3. Overview across events (FR-19).
4. Test-mode controls (FR-26).
5. Correct or remove a helper (FR-30).
6. Undo and reopen (FR-31).
7. Change the answer (FR-14).
8. Edit event fields (FR-29).
9. Delete an event (FR-32).

**Cut list.** If time runs out, drop from the bottom of the Should list first: FR-32, then FR-29, FR-14, FR-31, FR-30, FR-26, FR-19, FR-10 email, and reminders with the test inbox last. Without reminders the core promise still holds, because Needs a helper and Urgent show Kari every stuck task.

**Stage 2, in priority order:** evaluations with an AI summary; a minimum anonymized experience bank; helper login; calendar export (.ics); guest list with idea suggestions and comments; AI-written reminders, clearly marked as written by AI.

**Out of scope:** native mobile app, professional planners, everyday task management, budget, cost-splitting and RSVP, voting and visual boards, SMS reminders, two-way chat integration, paid services of any kind.

## 9. Success Metrics

**Functional.** Every Must FR, and every Should FR that is built, has at least one automated test in the traceability table, and `npm test` passes. This covers the brief's eight functional criteria.

**Product.** 2–3 friends act as helpers in a realistic test event on the deployed app (NFR-8) before the deadline. Test tasks get short deadlines, so the 3-day rules apply during the test.
- **SM-1:** no task is silently forgotten. Every task ends Done, Declined or Can't be done, and each of these is visible to the organizer.
- **SM-2:** at least 80% of tasks get a yes or no within 3 days.
- **SM-3:** at least 80% of Accepted tasks are Done by their deadline.
- **SM-4:** the organizer only adjusts the AI plan draft. She does not rewrite it.
- **SM-5:** helpers find the reminders helpful, not annoying (if reminders are built).

**Counter-metrics** (signs that something is going wrong):
- **CM-1:** the organizer deletes or rewrites more than half of the drafted tasks, so the AI is not saving her work.
- **CM-2:** a task first shows as Needs a helper within 3 days of its deadline, too late to reassign.
- **CM-3:** a helper asks to stop getting reminders.

**Course.** Grading is 70% code and functionality, 30% reflection report. The planning trail (brief, PRD, architecture), regular commits and reviews document how AI was used and how quality was ensured. The friends test is reported against SM-1 to SM-5.

## 10. Open Questions

1. **Free services:** which hosting, language model and email service meet NFR-4 and NFR-8 at zero cost? To be decided in the architecture step.
2. **Helper names:** helpers are identified by email. Does the organizer also enter a name to show on her pages, such as "Ola"?
3. **UI language:** English, Norwegian, or both?
4. **Story count:** the teacher warned that the number of stories could grow. To be handled in the epics-and-stories step.
