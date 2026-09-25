---
title: "Product Brief: MasterPlan"
status: final
created: 2026-09-25
updated: 2026-09-25
---

# Product Brief: MasterPlan

## Executive Summary

MasterPlan is a web-based planning platform for people who have to organize a big private event without being planners themselves. Examples are a bachelorette party, a wedding or a milestone birthday. Its promise: **every task has someone responsible for it, and nothing is forgotten without someone noticing.**

Today these events are coordinated through group chats, notes and people's memories. Helpers agree to tasks and forget them, nobody follows up, and the organizer finds out too late. MasterPlan fixes this in three ways:
- **AI drafts the plan.**
- **Helpers accept or decline each task** from a link.
- **AI-written email reminders keep helpers on track.**

The organizer sees, across all her events, what's confirmed, declined or overdue. Evaluations are summarized by AI and stored in an anonymized experience bank, so each event improves the next plan.

Version 1 is a solo project for IBE160 Programmering med KI. It is built with AI and due in November 2026.

## Who This Serves

**The reluctant organizer.** A private individual who has ended up in charge of a big event without the skills, or the wish, to run it, and who fits it around a busy and stressful life. *Example:* a maid of honor organizing a bachelorette party (15 guests, 6 months away) and the wedding (80 guests, 8 months away) with five helpers. She needs to be told what has to happen and when, and she needs to trust that the helpers will actually do their tasks.

**The helpers.** Friends and family who have taken on part of the work. They open their tasks from a link with nothing to set up, or they create a login to follow the whole plan.

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
3. **Follow-through.** **AI-written email reminders** are personal, respectful and direct, the way a good manager speaks to a team member. **One overview across all events** shows what's confirmed, declined, overdue and due soon.
4. **Learning.** **Evaluations during and after events**, such as a check-in after the bachelorette party, are summarized by AI. Anonymized lessons feed a shared **experience bank** that improves future plans.

## What Makes This Different

The individual pieces already exist elsewhere. MasterPlan is different because of **who it's built for** and **what it prevents**:
- **Follow-through is the core feature.** Every task gets a yes or no, reminders are personal, and risks become visible early.
- **It's built for people who aren't planners.** It gives them a starting plan rather than a blank board.
- **It handles several overlapping events** that share the same helpers.
- **It learns** through the experience bank. *Caveat:* this only becomes an advantage after many evaluated events. At launch, the AI relies on general knowledge.

There is no technical moat. The advantage is a clear focus on one user and one problem.

## Scope

Version 1 is a web app, built solo in about two months.

**Must work:** the full loop of plan → follow through → learn.
1. Login for organizers. Helpers can create a login if they want.
2. Events created from templates by event type, with several events running at once.
3. An AI-drafted, editable plan. If the AI fails, the template works as a fallback.
4. Tasks assigned by link, with yes/no answers and optional messages.
5. AI-written reminders by email.
6. An organizer overview across all events.
7. Evaluations during and after events, with an AI summary.
8. A minimum experience bank: evaluations stored anonymized and available to the AI.
9. Calendar export (Google Calendar or .ics) and task links that can be shared into chat apps.

**If there's time:** a guest list, plus idea suggestions and comments from helpers.

**Not in version 1:**
- mobile app
- professional planners as users
- everyday task management
- budget, cost-splitting and RSVP
- voting and visual boards
- text-message reminders
- two-way chat integration

## Success Criteria

**Product.** Before the November deadline, 2–3 friends run a realistic test event as helpers.
- **No task is silently forgotten.** Every task ends up done or openly declined.
- **Answers:** at least **80%** of tasks get a yes or no within 3 days.
- **On time:** at least **80%** of accepted tasks are done by their deadline.
- **AI output:** the AI plan needs only adjustments, not a rewrite. Helpers find the reminders helpful, not annoying. The AI summary of the evaluation is accurate.

**Course.**
- **Code and functionality (70%):** the must-work features run end to end, with documentation of how AI was used and how quality was ensured (BMad planning trail, reviews, tests).
- **Reflection report (30%):** the development process, the influence of AI, and the ethical and technical issues.

**Key ethical constraints:**
- **Privacy:** only anonymized, general lessons go into the experience bank, in line with the GDPR.
- **Transparency:** helpers can tell that AI wrote their reminders, and the reminders never manipulate or guilt-trip.
- **Control:** the organizer can edit or override every AI-drafted plan.

## Vision

The goal is to become **the place people go when they have to organize something big**, and a tool they enjoy enough to return to. The roadmap has four steps:
1. **A richer web platform:** the full experience bank shaping every plan; budget, cost-splitting and RSVP; voting and idea and visual boards.
2. **More templates for more people:** students' projects, trips, reunions and more.
3. **A template marketplace:** professional planners sell their expertise to private individuals.
4. **A mobile app.**
