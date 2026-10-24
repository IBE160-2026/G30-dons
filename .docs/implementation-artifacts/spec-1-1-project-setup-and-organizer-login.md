---
title: 'Story 1.1: Project setup and organizer login'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_commit: 'e5487fbc42c625d98b525d8eaf1ea9f9bcdcafae'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has no application yet. Every later story needs the scaffold (config, clock, dates, errors, paths, database with migrations, test harness), and organizers need an account before they can own events.

**Approach:** Hand-scaffold the Node/TypeScript app exactly as the architecture spine's Stack, Conventions and Structural Seed describe, with only the pieces this story uses, and build registration, login and logout for organizers on top of it.

**Decisions:**
- The app lives at the repository root (`package.json`, `src/`, `public/`, `tests/` next to `README.md`); the spine's `masterplan/` tree maps to the root. Quick Start is `git clone`, `cd G30-dons`, `npm install`.
- The spec is kept as one story (about 2,300 tokens, above the 1,600 target), because the scaffold has no testable user value without login.

## Boundaries & Constraints

**Always:**
- Pinned versions from the spine's Stack table, exact (no `^`). tsconfig: `module`/`moduleResolution` `nodenext`, `types: ["node"]`, `skipLibCheck`, `strict`. Node `engines: ">=22.12"`, `.node-version` = `24`.
- Layering `routes → services → db`; `domain/` pure; `config.ts` is the only reader of `process.env`; `clock.ts` is the only source of time (no `new Date()` elsewhere, no SQL timestamp defaults).
- Only the `organizers` table: `id` integer PK, `name`, `email` (unique, trimmed + lowercased), `password_hash`, `created_at` (UTC ISO from the clock). One committed migration from `drizzle-kit generate`; `db/migrate.ts` runs on server start and test setup. `PRAGMA foreign_keys = ON` on every connection.
- Passwords: `node:crypto` scrypt, random per-user salt, constant-time compare. Wrong password and unknown email give the identical Norwegian error and status.
- Session: cookie-session, `httpOnly`, `sameSite: 'lax'`, `secure` when `TEST_MODE` is off; helmet defaults; no inline JavaScript.
- PRG with one-time flash; form validation errors re-render with HTTP 422; Norwegian UI text in EJS; every URL from `routes/paths.ts`; error codes in `domain/errors.ts`.
- `loadConfig(env)`: with `TEST_MODE` off, a missing `SESSION_SECRET`, `APP_BASE_URL` or `MAIL_TRANSPORT`, or a `MAIL_TRANSPORT` other than `disabled`, throws a clear error and the app does not start (`gmail` is added in Story 3.2). `APP_BASE_URL` defaults to `http://localhost:PORT` in test mode; `PORT` defaults to 3000; `DATABASE_AUTH_TOKEN` required unless `DATABASE_URL` starts with `file:`.
- Tests: Vitest + supertest, `loadConfig` given an explicit env (never `.env`), a fresh SQLite file per test file under a temp dir, a fixed clock, no network.

**Never:** events, tasks, helpers, AI, mail, seed or test-inbox code; CSS framework; ts-node, typescript-eslint or anything needing the TS compiler API; `drizzle-kit push`; CSRF tokens or login rate limiting (deferred by the spine); revealing whether an email exists.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Register | name, ` Kari@Example.no `, password ≥ 8 chars | organizer saved with `kari@example.no`, scrypt hash, logged in, redirect to overview | N/A |
| Register, email taken | email already registered (any case) | not created | 422, Norwegian "e-posten er allerede i bruk" |
| Register, invalid input | empty name, bad email, password < 8 | not created | 422 with field errors, input kept (not the password) |
| Login OK | correct email (any case) + password | session set, redirect to overview | N/A |
| Login wrong password / unknown email | either | identical page, same Norwegian error | 422 both cases |
| Logout | POST logout | session cleared, redirect to login | N/A |
| Not logged in | GET organizer page | redirect to login | N/A |
| Unknown route | any | Norwegian 404 page | N/A |
| Config, prod missing settings | `TEST_MODE=false`, no `SESSION_SECRET`/`APP_BASE_URL`/`MAIL_TRANSPORT`, or `MAIL_TRANSPORT=gmail` | `loadConfig` throws, naming the setting | startup aborted |

</frozen-after-approval>

## Code Map

Greenfield: no application code exists. Existing files to respect:

- `.gitignore` -- already ignores `node_modules/`, `.env`, `.env.*` (keeps `.env.example`); add `data/`.
- `README.md` -- group-project header in Norwegian; keep it, add a short "Kom i gang (utvikling)" section only. Full examiner README is Story 1.6.
- `.docs/`, `_bmad/`, `.claude/` -- planning and tooling; do not touch.

Pinned versions verified on npm 2026-10-24 (all exist). Local toolchain: Node 24.21.0, npm 11.19.0. Add `@types/ejs` 3.1.5 (not in the spine's table but needed for strict typing of EJS).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- name `masterplan`, `type: module`, exact pinned deps, scripts `dev` (tsx watch src/server.ts), `start` (tsx src/server.ts), `test` (vitest run), `db:generate` (drizzle-kit generate); `engines` -- Stack table
- [x] `tsconfig.json`, `.node-version`, `vitest.config.ts`, `drizzle.config.ts` -- spine conventions; tests in `tests/`
- [x] `.env.example` -- every setting this story reads, safe defaults: `TEST_MODE=true`, `PORT=3000`, `DATABASE_URL=file:./data/local.db`, `SESSION_SECRET=` (dev placeholder), `APP_BASE_URL=`, `MAIL_TRANSPORT=disabled`, `DATABASE_AUTH_TOKEN=` -- FR28
- [x] `src/config.ts` -- `loadConfig(env)` with zod, rules above -- AD-10
- [x] `src/clock.ts` -- `Clock` interface `{ now(): string; today(): string }`, system clock and `fixedClock(iso)` -- AD-4
- [x] `src/domain/dates.ts` -- `osloDate`, `daysBetween`, `addDays` via `Intl` with `Europe/Oslo`; `src/domain/errors.ts` -- `ErrorCode` registry, `DomainError`, Norwegian texts -- AD-1, AD-4
- [x] `src/db/schema.ts`, `src/db/client.ts`, `src/db/migrate.ts`, `src/db/migrations/` -- organizers table, foreign keys on, migrate on start -- AD-12, AD-14
- [x] `src/services/auth.ts` -- `register`, `authenticate`, `getOrganizer`; scrypt hashing; email normalization -- FR1, AD-5
- [x] `src/routes/paths.ts`, `src/routes/organizer/auth.ts`, `src/routes/organizer/overview.ts`, `src/routes/middleware.ts` (`requireLogin`, flash) -- registration, login, logout, placeholder overview "Oversikt" showing the organizer's name and a logout button -- FR1, AD-1
- [x] `src/app.ts`, `src/server.ts` -- `createApp({ config, db, clock })`; helmet, cookie-session, EJS, static `public/`, `GET /health` → 200, 404 and error handlers; server loads config, migrates, listens -- AD-1, AD-16
- [x] `src/views/` -- `layout`, `register`, `login`, `overview`, `404`, `error` EJS in Norwegian; `public/styles.css` minimal readable styling
- [x] `tests/helpers.ts` + `tests/config.test.ts`, `tests/dates.test.ts`, `tests/auth.test.ts`, `tests/app.test.ts` -- I/O matrix, Oslo date boundary around midnight UTC, cookie flags and helmet headers, health, migration applied, foreign keys pragma on -- FR27
- [x] `.gitignore`, `README.md` -- as in Code Map

**Acceptance Criteria:**
- Given a fresh clone, when `npm install`, copy `.env.example` to `.env`, `npm run dev`, then the app starts on `http://localhost:3000`, creates `data/local.db` with migrations applied, and `GET /health` returns 200.
- Given `npm test`, then all tests run offline with a fixed clock and own databases and Vitest prints a pass/fail summary.
- Given any logged-in organizer request, then `organizerId` comes only from the session; organizer-scoped 404 checks across organizers are added in Stories 1.2 and 1.3 when there are resources to scope.

## Implementation Notes

- Implemented directly in the planning session (no implementation subagent).
- Login failures re-render with 422 (per the I/O matrix) instead of redirecting with a flash; wrong password and unknown email produce byte-identical pages apart from the echoed email. Unknown emails are checked against a dummy scrypt hash so both paths take the same time.
- Views use `partials/top.ejs` + `partials/bottom.ejs` instead of a single `layout` (EJS has no layouts). `app.engine('ejs', ejs.renderFile)` because `@types/ejs` lacks `__express`.
- `server.ts` calls `process.loadEnvFile()` when `.env` exists (Node built-in, no dotenv); `loadConfig` still receives `process.env` once.
- `trust proxy` is set when test mode is off, so the `secure` cookie works behind Render's TLS proxy.
- `domain/dates.ts` uses `new Date(ms)` only to format given values, never to read the current time; `clock.ts` stays the only time source.
- Tests: each test gets a new SQLite file under `os.tmpdir()/masterplan-tests`, cleared once per run in `tests/globalSetup.ts`. Per-test deletion was dropped because Windows keeps the file locked after close (EPERM, about 1 s of retries per test).
- `npm audit` reports 4 moderate advisories, all in drizzle-kit's dev-only esbuild dependency (dev-server issue not used here). Left as is.
- Verified: `npm test` 36/36 pass in about 3 s; `npm run typecheck` clean; `npm run dev` with `.env` from `.env.example` serves `/health` 200, creates `data/local.db`, and register → overview shows the name.

## Spec Change Log

## Review Triage Log

Review pass 1 (blind, edge-case, verification-gap layers).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | Error page fails for errors raised before the locals middleware; handler always sends 500 | medium | `paths`/`flash` were set after `urlencoded`; a >50 kB body would throw inside `error.ejs` | patch: locals set first, 4xx status kept; 413 test added |
| 2 | Foreign keys off on extra pooled libsql connections (local) | false | Probe: a fresh libsql connection reports `foreign_keys = 1` with no PRAGMA, also on a second connection while a transaction is open | rejected; regression test added |
| 3 | Foreign keys off on Turso (remote) | maybe-false | Not checkable offline; would be medium if true | defer: check in Story 1.7 |
| 4 | `app.listen` error ignored (port in use) | low | Express 5 passes the error to the callback; success line printed anyway | patch: log and exit 1 (verified manually) |
| 5 | `loadEnvFile` swallows every error | low | `catch {}` hid a malformed or unreadable `.env` | patch: only ENOENT ignored |
| 6 | `SESSION_SECRET` strength not enforced in production | medium | `.env.example` placeholder accepted with test mode off | patch: ≥32 chars, placeholder refused; tests added |
| 7 | `APP_BASE_URL` accepts non-http schemes | low | `z.url()` accepts any protocol; links will be built from it | patch: http/https only; test added |
| 8 | Email has no max length | low | Only the 50 kB body limit bounded it | patch: max 254 |
| 9 | "missing TEST_MODE as off" test passes for the wrong reason | low | `loadConfig({})` failed on `DATABASE_URL` regardless of mode | patch: test rewritten |
| 10 | `DATABASE_URL` missing in production not pinned | medium | No test omitted it with test mode off | patch: added to `it.each` |
| 11 | Unique-index race branch never exercised | medium | Both tests hit the pre-insert SELECT | patch: concurrent `register` test |
| 12 | Logged-in redirect from login/register untested | low | No test GETs them with a session | patch: test added |
| 13 | Bare relative `file:` path in `openDb` untested | medium | Tests always used `file://` URLs | patch: test with missing subfolders |
| 14 | `absoluteUrl` untested | low | No caller or test yet; links depend on it later | patch: test added |
| 15 | Server startup (env, migrate) has no automated test | medium | Removing `runMigrations` from `server.ts` breaks no test | defer: process-level smoke test |
| 16 | Secure cookie throws over plain HTTP with test mode off | low | cookie-session refuses secure cookies without TLS; Render sends `X-Forwarded-Proto` and `trust proxy` is set | defer: document in Story 1.7 deploy guide |
| 17 | No CSRF tokens | false | Spine defers CSRF (sameSite=lax); spec Never excludes it | rejected (out of scope by intent) |
| 18 | No login rate limiting | false | Spine defers rate limiting; spec Never excludes it | rejected (out of scope by intent) |
| 19 | Logout doesn't revoke a copied cookie | low | Inherent to stateless cookie-session chosen by the spine | rejected (architecture choice) |
| 20 | Registration reveals that an email exists | false | Frozen I/O matrix requires the "email taken" message | rejected |
| 21 | `verifyPassword` crashes on a malformed stored hash | low | Hashes are only written by `hashPassword`; no path to a malformed row was shown | rejected |
| 22 | `dummyHash` unawaited promise could reject | false | Fixed-parameter scrypt on random input does not reject | rejected |
| 23 | Node version stated inconsistently | false | `engines >=22.12` and `.node-version 24` (Render) are both spine decisions | rejected |
| 24 | Migration meta files missing from the reviewed diff | false | Excluded from the review patch on purpose; present in the tree and committed with the story | rejected |
| 25 | Unused `setFlash`, `not_found` | low | Kept for PRG and 404 use in Stories 1.2+ | rejected |
| 26 | Form errors not linked with `aria-describedby` | low | Real but cosmetic for now; touches every form | rejected |
| 27 | No SIGTERM handling | low | Render restarts the process; nothing to flush | rejected |
| 28 | `:memory:` / `FILE:` URLs demand an auth token | low | No one configures those | rejected |
| 29 | Unicode email normalization (NFC/NFD) | low | Unlikely in everyday use | rejected |
| 30 | Empty login fields skip the dummy hash (timing) | low | Empty fields reveal nothing about accounts | rejected |
| 31 | POST login while logged in switches account | false | Logging in as someone else is expected behaviour | rejected |
| 32 | `addDays` with a non-integer | low | No caller passes one | rejected |
| 33 | No `layout` view as listed in tasks | low | Top/bottom partials used instead (EJS has no layouts); recorded in Implementation Notes | rejected |

## Design Notes

`createApp` takes its dependencies so tests build an app per test file with `loadConfig({ TEST_MODE: 'true', DATABASE_URL: 'file:<tmp>/test.db', SESSION_SECRET: 'test' })` and `fixedClock('2026-11-01T10:00:00Z')`. Services receive `db` and `clock` as arguments rather than importing singletons, so the seed (1.6) can pass a moving clock.

## Verification

**Commands:**
- `npm test` -- expected: all green, summary printed
- `npx tsc --noEmit` -- expected: no type errors
- `npm run dev` then `curl -s -o /dev/null -w "%{http_code}" localhost:3000/health` -- expected: 200

**Manual checks (if no CLI):**
- Register, log out, log in with wrong password and unknown email: same message; overview shows the name.
