---
title: "Product Brief: MasterPlan"
status: final
created: 2026-09-25
updated: 2026-10-24
---

# Product Brief: MasterPlan

## Executive Summary

MasterPlan is a web-based planning platform for people who have to organize a big private event without being planners themselves. Examples are a bachelorette party, a wedding or a milestone birthday. Its promise: **every task has someone responsible for it, and nothing is forgotten without someone noticing.**

Today these events are coordinated through group chats, notes and people's memories. Helpers agree to tasks and forget them, nobody follows up, and the organizer finds out too late. MasterPlan fixes this in three ways:
- **AI drafts the plan.**
- **Helpers accept or decline each task** from a link.
- **Email reminders keep helpers on track.**

The organizer sees, across all her events, what's confirmed, declined or overdue. Later, evaluations will be summarized by AI and stored in an anonymized experience bank, so each event improves the next plan.

Version 1 is a solo project for IBE160 Programmering med KI. It is built with AI and due in November 2026.

## Who This Serves

**The reluctant organizer.** A private individual who has ended up in charge of a big event without the skills, or the wish, to run it, and who fits it around a busy and stressful life. *Example:* a maid of honor organizing a bachelorette party (15 guests, 6 months away) and the wedding (80 guests, 8 months away) with five helpers. She needs to be told what has to happen and when, and she needs to trust that the helpers will actually do their tasks.

**The helpers.** Friends and family who have taken on part of the work. They open their tasks from a link with nothing to set up, usually on a phone after the link was shared in a chat app. (A helper login to follow the whole plan comes in stage 2.)

## The Problem

The work is handed out in group chats, notes and emails, and **nobody follows up**. Helpers forget tasks and nobody notices until the last minute. The result is stress, tension between people and chaotic parts of the event. The founder experienced exactly this while helping to organize a recent event.

Existing tools don't close the gap:
- Group chats bury tasks.
- General task tools (Notion, Trello, Todoist) assume the user is a planner.
- Specialist event apps each cover one piece: invitations, cost-splitting or itineraries.

The reluctant organizer lacks both **knowing what to do** and **a way to make others follow through**.

## The Solution

1. **A plan without being a planner.** She picks an event template and describes the event. The AI drafts the tasks with sensible deadlines, and she adjusts the draft.
2. **Clear responsibility.** Helpers get a link and answer **yes or no** to each task, with an optional message. They can change their answer later.
3. **Follow-through.** **Email reminders** use a fixed text that is respectful and direct, the way a good manager speaks to a team member. AI-written reminders come in stage 2. **One overview across all events** shows what's confirmed, declined, overdue and due soon.
4. **Learning (stage 2).** **Evaluations during and after events**, such as a check-in after the bachelorette party, are summarized by AI. Anonymized lessons feed a shared **experience bank** that improves future plans.

## What Makes This Different

The individual pieces already exist elsewhere. MasterPlan is different because of **who it's built for** and **what it prevents**:
- **Follow-through is the core feature.** Every task gets a yes or no, reminders go out automatically, and risks become visible early.
- **It's built for people who aren't planners.** It gives them a starting plan rather than a blank board.
- **It handles several overlapping events** that share the same helpers.
- **It learns** through the experience bank. *Caveat:* this only becomes an advantage after many evaluated events. At launch, the AI relies on general knowledge.

There is no technical moat. The advantage is a clear focus on one user and one problem.

## Scope

Version 1 is a web app, built solo in about two months.

**Must work (version 1):** the core loop of plan → follow through. It is built in this order, and each step is finished and stable before the next one starts.
1. Login for organizers.
2. Events created from templates by event type, with several events running at once.
3. An AI-drafted, editable plan. If the AI fails, the template works as a fallback.
4. Tasks assigned by link, with yes/no answers and optional messages. The link works without login and is easy to share into chat apps.
5. An organizer overview across all events.
6. One type of email reminder, with a fixed text.

**Stage 2 (if there's time), in priority order:**
1. Evaluations during and after events, with an AI summary.
2. A minimum experience bank: evaluations stored anonymized and available to the AI.
3. Login for helpers, so they can follow the whole plan.
4. Calendar export (.ics).
5. A guest list, plus idea suggestions and comments from helpers.
6. AI-written reminders that are personal and clearly marked as written by AI.

**Not in version 1:**
- mobile app
- professional planners as users
- everyday task management
- budget, cost-splitting and RSVP
- voting and visual boards
- text-message reminders
- two-way chat integration

**Running without keys (test mode).** Anyone can run the app locally by following the README, without our API keys or paid accounts:
- **AI:** without a language-model key, the app uses a fixed mock response for the plan draft. The template fallback also covers this.
- **Email:** in test mode, nothing is sent. Every email appears on a test inbox page inside the app, shown only in test mode, so nothing extra has to be installed.
- **Setup:** a `.env.example` file lists every setting. A seeded test organizer has a ready-made event with helpers and tasks in different statuses.
- **Secrets:** API keys and email settings are never committed.

## Success Criteria

**Functional (testable).** Each criterion becomes at least one automated test.
1. **Link access:** a helper can open a task link without logging in, and sees only their own tasks. A changed or invalid link gives no access.
2. **Yes/no:** a helper can accept a task, or decline it with a message. The organizer then sees the new status and the message in the overview.
3. **Changing an answer:** a helper can change a yes to a no, or the reverse, and the overview updates.
4. **Status rules:** a task is *open* until it is answered, then *accepted* or *declined*. An accepted task is then marked *done* or *can't be done* by the helper, and the organizer can also mark it *done* herself. An accepted, unfinished task is *due soon* within 3 days of its deadline, and *overdue* after the deadline. A reminder is due at whichever comes first: 14 days after the helper said yes, or 3 days before the deadline. When the organizer reassigns a task, it disappears from the first helper's page.
5. **AI fallback:** if the AI call fails or returns an invalid plan, the event is created from the template, and the organizer is told.
6. **Editing:** the organizer can add, change, delete and reassign every task in an AI-drafted plan.
7. **Overview:** given a fixed set of test events, the overview shows the expected number of tasks in each status, per event.
8. **Reminders:** a reminder is created at the right time for an accepted, unfinished task, following the rule in criterion 4. In test mode it lands in the test inbox. Unanswered tasks get no reminder: after 7 days without an answer they are flagged on the organizer's page so she can follow up.

**Product (evaluation).** Before the November deadline, 2–3 friends run a realistic test event as helpers. These goals depend on how the helpers behave, so they are used to evaluate the product, not as tests.
- **No task is silently forgotten.** Every task ends up done or openly declined.
- **Answers:** at least **80%** of tasks get a yes or no within 3 days.
- **On time:** at least **80%** of accepted tasks are done by their deadline.
- **AI output:** the AI plan needs only adjustments, not a rewrite.
- **Reminders:** helpers find the reminders helpful, not annoying.

**Course.**
- **Code and functionality (70%):** the must-work features run end to end, the functional criteria pass as tests, and the app runs from the README in test mode. This is backed by documentation of how AI was used and how quality was ensured (BMad planning trail, reviews, tests).
- **Reflection report (30%):** the development process, the influence of AI, and the ethical and technical issues.

**Key ethical constraints:**
- **Privacy:** only anonymized, general lessons go into the experience bank, in line with the GDPR.
- **Respect:** reminders never manipulate or guilt-trip. If AI-written reminders arrive in stage 2, helpers must be able to tell that AI wrote them.
- **Control:** the organizer can edit or override every AI-drafted plan.

## Vision

The goal is to become **the place people go when they have to organize something big**, and a tool they enjoy enough to return to. The roadmap has four steps:
1. **A richer web platform:** the stage 2 features first, then the full experience bank shaping every plan; budget, cost-splitting and RSVP; voting and idea and visual boards.
2. **More templates for more people:** students' projects, trips, reunions and more.
3. **A template marketplace:** professional planners sell their expertise to private individuals.
4. **A mobile app.**
