---
title: "Addendum: MasterPlan PRD"
created: 2026-10-24
---

# Addendum: MasterPlan PRD

Detail for downstream documents (UX spec, architecture), not requirements.

## UX: organizer event view (for bmad-ux)

- One tab per event (for example, "Wedding", "Bachelorette party"). The organizer picks one.
- Left: an information box with the event date, number of guests and general information.
- Right: panels that expand and collapse when the organizer selects the heading. A collapsed panel shows a one-line summary:
  - **Done:** "12 of 30 done", with a progress bar.
  - **To do:** "3 urgent, 2 needs a helper".
  - **Timeline:** "38 days to go, next due Friday".
  - **Messages / helpers:** "2 new replies".

## UX: helper page (for bmad-ux)

- White, clean page, mobile-first.
- Header: "Kari has invited you to organize Wedding and Bachelorette party with MasterPlan!"
- One card per task: "Kari wants you to buy napkins and straws by [date]", Yes / No, and a message box.

## Tech notes (for bmad-architecture)

- Prerequisites: Node.js 20 or newer, Git.
- README Quick Start: `git clone`, `cd masterplan`, `npm install`, copy `.env.example` to `.env`, `npm run seed`, `npm run dev`, open the local URL.
- `npm test` runs the full suite against a separate test database.
