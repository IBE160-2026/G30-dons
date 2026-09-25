---
title: "Addendum: MasterPlan product brief"
created: 2026-09-25
updated: 2026-09-25
---

# Addendum: MasterPlan

Supporting detail for the PRD and architecture work that doesn't belong in the brief itself.

## Course requirements (IBE160 Programmering med KI, fall 2026)

The examiner's criteria, as provided by the founder:

**Project code and functionality: 70% of the grade** (group or solo submission)
- Students submit an AI-generated application.
- The documentation must show how AI was used and how the students ensured the quality of the code.

**Reflection report: 30% of the grade** (group or solo submission)
- A description of the development process, the challenges and the solutions.
- A critical evaluation of how AI influenced the final result.
- A discussion and justification of the ethical and technological implications.

**Project constraints:** solo developer; code written with AI; deadline November 2026; database and login required.

## Detail moved from the brief (shortened to 1–2 pages)

**Persona detail.** The maid of honor doesn't want a project-management tool. The bachelorette party and the wedding overlap and share some helpers, which is why version 1 needs an overview across events. Some helpers may organize an event themselves one day, so the evaluation lessons are useful to everyone involved, not only the organizer.

**Helper experience.** An answer can include a message, for example "Yes, but I need the budget first". A helper with a login can follow the whole plan. If time allows, they can also suggest ideas and comment.

**Reminder tone.** The first idea was humorous reminders. This was changed to personal, respectful and direct reminders, because a joke on an overdue task can read as passive-aggressive.

**Evaluation cadence.** Evaluations happen during planning, for example after the bachelorette party and two months before the wedding, as well as after each event.

**Ethical and technical considerations**, in full. These also feed the reflection report.
- **Privacy in the experience bank.** Evaluations can contain names, conflicts and personal details. Only anonymized general lessons may be stored and shared, which matters under the GDPR.
- **AI talking to real people on someone's behalf.** Reminders go out in the organizer's name to her friends. It must be clear that AI wrote them, and the tone must never become manipulative or guilt-tripping.
- **Trust in AI plans.** An AI plan can be wrong or leave things out. The organizer must be able to see, edit and override everything, and templates act as a safety net.
- **AI-generated code.** The app itself is written with AI, so quality assurance (reviews, tests, the planning trail) is part of its credibility.

**Vision detail.** The aim is to make MasterPlan user-friendly enough that private individuals use it often, not once in a lifetime. The template marketplace brings professional planners in as a second audience and gives reluctant organizers plans of expert quality. The mobile app comes only once the web platform has proven itself.

## Parked for later versions

Not in version 1. Calendar export and sharing links into chat apps *are* in version 1; only two-way chat integration is parked.

- **Professional planners** (wedding planners, event management) as an audience. They run many events at once for clients and would need reusable templates, client and supplier contacts, an overview across events and possibly invoicing. One possible connection: professionals' experience could become templates and guidance for private individuals.
- **Everyday-life task management.** Cut from version 1 because Todoist and Google are strongest there.
- **Mobile app.** Version 1 is web only.
- **Richer brainstorming.** Voting on ideas, a shared idea board, a shared color palette or mood board, and visual identity tools. Version 1 keeps only idea suggestions and comments.
- **Budget, cost-splitting and RSVP.** Covered in the brief's Vision section.
- **Text-message reminders.** Version 1 sends email only, because text messages need a paid service.
- **Full experience bank.** The AI would actively draw on anonymized lessons from other users' events when it drafts new plans.
- **AI chat-to-tasks** (paste a chat thread, get tasks). Already common in other products, so not a differentiator.
- **Two-way chat integration** (reading or posting messages in WhatsApp or Messenger). Too heavy for a two-month solo project.

## Competitive landscape (web research, Sept 2026)

Many comparison sources are competitor-run blogs, so they are biased. Items marked [unverified] were not checked against a primary source.

### Existing tools and where they fall short for group coordination

| Tool | Does well | Falls short |
|---|---|---|
| WhatsApp / Messenger groups | Everyone is already there; the default place people talk. WhatsApp added private AI message summaries in 2025 | Decisions, dates and links get buried in long threads |
| Notion / Trello / Asana | Flexible boards, docs and tasks | Built for work teams; hard for casual guests; no RSVP, voting or cost-splitting for events [unverified] |
| Todoist / Google Tasks & Keep | Personal to-do lists | Weak group collaboration; events aren't their own concept |
| Google Calendar / TimeTree / Cozi | Shared calendars | Calendars only, with no real lists; Cozi's free tier only shows 30 days ahead (since 2024) |
| Wanderlog | Real-time shared trip itinerary with a map | Basic expense tracking; offline needs Pro; travel only |
| Troupe / WhenAvailable | Voting on dates and places | Stops once the decision is made |
| Splitwise | The standard for splitting costs | Free tier has a daily cap and ads; low review scores |
| Partiful | Stylish invites; guests can RSVP without an app | One event at a time; no task management |
| Zola / Joy / Appy Couple | Wedding websites, RSVP, schedules | Weddings only; focused on the couple |
| SquadTrip, AvoSquado, TripLinq, NomadCrew | "All-in-one" group trip apps | Crowded market; travel only |

### AI trends, 2025–2026
- ChatGPT Group Chats (up to 20 people) became available globally in Nov 2025; OpenAI names trip planning as a use case.
- Google AI Mode "Canvas" turns a prompt into an editable, shareable itinerary using live data, and is adding booking features.
- Todoist Ramble (Jan 2026) turns speech into tasks; Task Assist breaks a project into subtasks.
- Notion AI lets users pick between several models and supports external agents [unverified].

### Common user complaints
- Too many apps: planner, expense app, chat and document folder live in separate places ("the money lives in one place, the plan in another").
- Plans stall in the group chat: long threads, lost information, too many notifications.
- One organizer ends up doing all the work while the chat drifts off-topic.
- Paywalls push people off free tools (Cozi, Splitwise, Wanderlog).
- Each specialist tool covers only one kind of event (trips, weddings or parties) and not everyday tasks [inference].

### What this means for MasterPlan (researcher's inference)
- The individual pieces already exist: tasks, events, RSVP and voting, and cost-splitting. No tool clearly combines everyday tasks with one-off events for both individuals and groups.
- Two features look like baseline expectations rather than differentiators: guests joining without installing anything (as with Partiful), and AI that turns chat messages into tasks.

### Sources
- https://techcrunch.com/2025/06/25/meta-is-adding-ai-powered-summaries-to-whatsapp/
- https://2sync.com/blog/todoist-vs-google-tasks
- https://www.usecalendara.com/blog/cozi-review-2026
- https://tripprof.com/en/blog/best-group-travel-planning-apps/
- https://whenavailable.com/blog/best-group-planning-apps
- https://splittyapp.com/learn/splitwise-free-limits/
- https://sacra.com/c/partiful/
- https://openai.com/index/group-chats-in-chatgpt/
- https://blog.google/products-and-platforms/products/search/agentic-plans-booking-travel-canvas-ai-mode/
- https://techcrunch.com/2026/01/21/todoists-app-now-lets-you-add-tasks-to-your-to-do-list-by-speaking-to-its-ai/
- https://stanford.edu/class/cs147/projects24/Designing-for-Movement/revisit/dist/pdfs/a4_revisit.pdf
