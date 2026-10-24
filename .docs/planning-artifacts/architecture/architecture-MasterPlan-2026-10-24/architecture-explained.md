---
title: "MasterPlan architecture in plain language"
created: 2026-10-24
---

# MasterPlan architecture in plain language

MasterPlan is **one web app with one database**. One Node.js program builds every page on the server and sends finished HTML to the browser. This is the simplest setup that works for a beginner building alone with AI help. There is no separate frontend, and there are no microservices.

**What I chose, and why:**

- **Node.js 22 or newer, TypeScript, Express and EJS.** These are mainstream and well documented. TypeScript catches mistakes before the code runs, which matters when much of the code is written by AI.
- **SQLite with the Drizzle ORM.** On my laptop, and for the examiner, the database is a single file and needs no installation. When deployed, the same code points to a free hosted SQLite service (Turso).
- **Rules in one place.** The rules for task statuses (Open, Accepted, Urgent, Needs a helper and so on) live in one small module that never touches the database or the clock. That makes them easy to test with a fixed date, and every page shows the same answer.
- **AI behind one door.** Only one module talks to the AI. It sends just the event type, the date and the organizer's description, never helpers' names or emails. Whatever the AI returns is checked against strict rules, and if it fails, the app uses the template's plan. I chose Anthropic's cheapest model, Claude Haiku 5.5, because the API does not use my data for training and lets me cap spending. A prepaid credit of $5 with auto-reload turned off is the most it can ever cost. A plan draft costs about $0.0006.
- **Email behind one door.** In test mode, emails are saved to a test inbox page instead of being sent. In the real deployment they go out through a Gmail account created only for MasterPlan, using Google's Gmail API. The free hosting blocks ordinary email ports, so this was the free option that still delivers well. If the Google setup fails, email can be switched off, and helpers still get their links through chat.
- **Reminders worked out on demand.** Once a day, a free scheduler calls the app, and the app works out which reminders are due. No schedule is stored, so editing a deadline can't leave a stale reminder behind, and a reminder is never sent twice.
- **Free hosting for the friends test.** The app runs on Render's free tier. It falls asleep when unused, so the first visit can take about a minute.
- **Test mode for the examiner.** The app runs with `npm install`, `npm run seed` and `npm run dev`. It needs no keys, no accounts and no internet, and `npm test` checks every requirement against a fixed date.

**The trade-off I accepted:** the project is not completely free. The AI costs a few cents a month, capped at $5, because the free AI tiers either use the data for training or aren't allowed for apps used in Norway.
