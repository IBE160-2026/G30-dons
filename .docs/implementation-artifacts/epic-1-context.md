# Epic 1 Context: Kari plans with templates and Ola answers by link (first deployable version)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver the core loop without AI or email: an organizer logs in, creates events from the Wedding and Bachelorette party templates (using each template's default plan), edits tasks, adds up to five helpers per event, assigns tasks and copies each helper's link into a chat. Helpers answer on their phones with no login. The overview and event view show what is done, Urgent and in Needs a helper. The examiner runs it with Docker in test mode (source code plus a `Dockerfile` is the course delivery), with seed data and `npm test`. The epic ends deployed on free hosting with email disabled, so the friends test can start; hosting is not a course requirement, so deployment is cut first if it causes problems. Solo course project, due 14 November 2026.

## Stories

- Story 1.1: Project setup and organizer login
- Story 1.2: Create events from templates and edit the plan
- Story 1.3: Add helpers, assign tasks and copy links
- Story 1.4: Ola answers on his phone
- Story 1.5: Overview and event view show what needs attention
- Story 1.6: Seed data, Docker and examiner guide
- Story 1.7: Deploy for the friends test (optional, first to cut)

## Requirements & Constraints

- Organizer pages require login. Wrong password and unknown email give the same error. Passwords stored only as salted hashes.
- An organizer sees and changes only her own events, tasks and helpers; another organizer's ids return 404.
- Events need a date that is not in the past. Several events can be active, one tab each.
- Template plans: deadlines computed from offsets; any deadline before today becomes today. All new tasks are Unassigned.
- Max five helpers per event. A helper is unique per (organizer, email); the same email across her events is the same helper with one link.
- Helper link: unguessable (≥128 bits), no login, shows only that helper's tasks, invalid links reveal nothing, GET never changes data, server refuses changes from a non-current helper or a stale page.
- Derived states (Urgent, Needs a helper, On track) recalculated on every page load against Oslo "today"; past events excluded. No real-time push.
- Helper page works from 360 px wide, no sideways scroll, easy-to-tap buttons.
- All UI text in Norwegian. Stores only what the core loop needs.
- Test mode (on in `.env.example`) means no email leaves the machine. `npm test` runs offline, with no keys, its own database and a fixed date, and ends with a pass/fail summary.
- README: Quick Start, test login, seeded helper links, things to try, known limitations. Docs: fixture table, FR→test traceability table, cost-and-mock plan. Secrets never committed; `.env` git-ignored.
- Near-zero cost: free hosting and database.
- Delivery (FR-33): source code plus a `Dockerfile`. The container runs in test mode with the `.env.example` defaults, a local database file, the seed data and (from Story 3.1) the test inbox. No secrets in the image; API keys come from the environment later, since the teacher has not yet said how keys are provided. The README explains the Docker steps.

## Technical Decisions

- **Paradigm:** layered monolith, one Node process, server-rendered EJS. Flow `routes → services → db`; pure `domain/` (no I/O, no clock) takes `now`/`today` and records as input. `domain/` imports nothing else from the project.
- **Routes** parse input with zod, call one service, then redirect or render. Post/Redirect/Get with a one-time session flash; validation errors re-render with 422; `DomainError` redirects with a flash. All URLs built by `routes/paths.ts` from `APP_BASE_URL`. Error codes in one `domain/errors.ts` registry mapping to Norwegian text.
- **Tasks:** `services/tasks` is the only writer of `tasks` and `messages`. Every status change goes through `tasks.apply(actor, taskId, command, now)`, checked by `domain/taskRules.transition`. Assign/reassign only to helpers linked in `event_helpers`. A repeat command with no change and no message is a no-op. Each helper command writes exactly one `messages` row; organizer commands write none. Editing title/deadline of an Accepted task sets `changed_since_answer`.
- **Derived states** only from `domain/status.ts` functions taking `(tasks, event, today)`; never stored, never computed in views.
- **Time:** `clock.now()` / `clock.today()` (Oslo date) are the only time sources; no `new Date()` elsewhere, no SQL timestamp defaults. Dates stored as `YYYY-MM-DD`, timestamps as UTC ISO. All conversions via `domain/dates.ts` (`osloDate`, `daysBetween`, `addDays`). Tests use a fixed clock.
- **Identity:** organizer requests scoped by session `organizerId`; helper requests scoped by token, never the session. Emails trimmed and lowercased everywhere. Helper rows never deleted. Tokens: 24 random bytes, base64url. Helper routes `/h/:token` send `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, generic Open Graph tags.
- **Config:** `config.ts` `loadConfig(env)` is the only reader of `process.env`; tests pass an explicit env and never load `.env`. With `TEST_MODE` off, missing `SESSION_SECRET`, `APP_BASE_URL` or `MAIL_TRANSPORT` (or an unknown value) stops startup. `APP_BASE_URL` defaults to `http://localhost:PORT` in test mode; `PORT` defaults to 3000; `DATABASE_AUTH_TOKEN` required unless `DATABASE_URL` is `file:`.
- **Database:** Drizzle + libSQL (SQLite file locally, Turso deployed). One `db/schema.ts`; each schema-changing story adds one committed `drizzle-kit generate` migration; never `drizzle-kit push`. `db/migrate.ts` runs on server start, seed and test setup. `PRAGMA foreign_keys = ON` on every connection; events→tasks/event_helpers and tasks→messages cascade. Tables arrive per story: organizers (1.1), events and tasks (1.2), helpers and event_helpers (1.3), messages (1.4).
- **Seed:** `seed(db, clock)` builds data only through services with a clock moved backwards, uses fixed tokens from `seed/fixture.ts`, exports `EXPECTED_COUNTS`; refuses unless test mode is on and the database is a `file:` path.
- **Browser:** no inline JS (`public/copy.js` with read-only input fallback); session cookie `httpOnly`, `sameSite: 'lax'`, `secure` when test mode is off; helmet defaults.
- **Auth:** `node:crypto` scrypt with per-user salt; one `requireLogin` middleware.
- **Conventions:** camelCase TS files; snake_case plural tables; integer PKs; status values `unassigned|open|accepted|declined|done|cant_do`; Glossary names in code (`needsHelper`, `urgent`, `onTrack`); one service call per request, multi-row changes in one transaction; `console` logging only.
- **Stack (pinned):** Node ≥22.12 (`.node-version` 24), TypeScript 7.0.2 run with tsx 4.23.15, Express 5.3.0, EJS 7.0.2, Drizzle ORM 0.45.4 / drizzle-kit 0.31.11, @libsql/client 0.18.0, zod 4.6.7, cookie-session 2.1.1, helmet 8.3.0, Vitest 5.0.5 (vite 8.3.5), supertest 7.3.1. tsconfig: `module`/`moduleResolution` `nodenext`, `types: ["node"]`, `skipLibCheck`, `strict`. No tools needing the TS compiler API (ts-node, typescript-eslint).
- **Docker (AD-17):** `Dockerfile` from `node:24-slim` (exact tag pinned), `npm ci`, non-root `node` user, port 3000; `.dockerignore` leaves out `.env`, `.env.*` (not `.env.example`), `data/`, `node_modules/`, `.git/`, BMAD folders. Run with `docker run --env-file .env.example -p 3000:3000 masterplan`. On start, when test mode is on and the database file is missing, seed first, then start the server; restart keeps data. DB file `/app/data/local.db`. Server listens on all interfaces. `npm test` stays Docker-free.
- **Deployment (optional, first to cut):** Render free web service, Turso free database; no data on Render's disk; cold start about 1 minute. `MAIL_TRANSPORT=disabled` for this epic.

## UX & Interaction Patterns

- Event view: one tab per event; information box on the left (date, guests, general info); collapsible panels on the right, each with a one-line summary when collapsed — Done ("N av M ferdig" with progress bar), To do (Urgent / Needs a helper counts), Timeline (days to go, next deadline), Messages (new replies).
- Messages panel opens via a real request (`GET /events/:id?panel=messages`), which marks only the listed replies seen.
- Helper page: white, clean, mobile-first. Header "‹Organizer› har invitert deg til å organisere ‹events›…". One card per task ("‹Organizer› vil at du skal ‹task› innen ‹date›") with Ja/Nei and a message box; Accepted tasks show Ferdig / Kan ikke gjøres. Tasks grouped by event, sorted by deadline; Unassigned tasks never shown.
- Helpers listed by name, or email if no name. Copy-link button "Kopier lenke".

## Cross-Story Dependencies

- 1.1 lays the scaffold everything else builds on: config, clock, dates, errors registry, paths, migrations, test harness, auth.
- Each story adds its own tables and migration; later stories must not change earlier migrations.
- 1.2–1.4 extend `domain/taskRules` and `services/tasks`; 1.5 reads them through `domain/status.ts`.
- 1.6 seeds through the services from 1.1–1.5 and needs every task status, so it comes after 1.4 and 1.5. It also adds the Dockerfile and the README Docker steps; Story 3.1 checks the test inbox inside the container.
- 1.7 deploys what 1.1–1.6 built. It is optional and the first thing cut if it causes problems.
- Epic 2 replaces the template plan with `ai/draftPlan` (template plan becomes the fallback); Epic 3 adds the mail module, reminders and the test inbox. Keep the plan-creation path and the config's `MAIL_TRANSPORT` handling ready for them.
