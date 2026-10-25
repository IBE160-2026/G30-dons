---
title: 'Story 1.6: Seed data, Docker and examiner guide'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '116d579248d04419e5cf4c9a59479d88f3d3d032'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The examiner must be able to run MasterPlan with Docker in test mode, see the whole core loop with ready-made data in a few minutes, and check every requirement against its tests. Today there is no seed data, no Dockerfile and no examiner guide; the delivery is the source code plus a Dockerfile.

**Approach:** Add `seed(db, clock)`, which builds a test organizer, a Wedding and a Bachelorette party with shared helpers and tasks in every status by calling the existing services with a clock moved backwards, and a guarded `npm run seed`. Add a Dockerfile that seeds on first start and runs in test mode with the `.env.example` defaults, and write the README and docs the examiner needs.

**Decisions:**
- The examiner docs (`README.md`, `docs/fixtures.md`, `docs/traceability.md`) are in Norwegian; `docs/cost-and-mock-plan.md` is copied as is, in English (user, 2026-10-25).
- Kept as one story (about 2,500 tokens), because the container must start with the seed and the README documents both (user, 2026-10-25).

## Boundaries & Constraints

**Always:**
- `seed/seed.ts` exports `seed(db, clock)`; it builds data **only through services** (`register`, `createEvent`, `addHelperToEvent`, `apply`, `applyAsHelper`, `updateTask`, `addTask`/`deleteTask`), never by inserting rows. It moves its own clock backwards so assignments, answers and messages have realistic past timestamps. All dates are relative to the seed day (AD-11).
- `seed/fixture.ts` exports the test login, fixed helper tokens (32 chars, `/^[A-Za-z0-9_-]{32}$/`) and `EXPECTED_COUNTS` per event: tasks per status, Urgent, Needs a helper, Done, New replies.
- Fixture targets: **Bachelorette party** is On track (every task Accepted or Done, none Urgent or Needs a helper). **Wedding** has at least one task in every status, at least one Urgent task, one stale Open task (assigned 7+ days ago), one task with `changed_since_answer`, and both New and seen replies. Helpers are shared across both events, and one helper has no name (shown by email).
- `npm run seed` refuses with a clear message unless `TEST_MODE=true` and `DATABASE_URL` is a `file:` path; otherwise it deletes the file, migrates and seeds, then prints the login and helper links.
- `taskRules.assertFieldInvariant(task)` (pure): Accepted requires `accepted_at`, every status except Unassigned requires `helper_id` and `assigned_at`, Unassigned requires neither. Done tasks may keep their helper.
- Docker (AD-17): `Dockerfile` from `node:24-slim` pinned to an exact tag, `npm ci --omit=dev`, non-root `node` user, port 3000; `.dockerignore` leaves out `.env`, `.env.*` (keeps `.env.example`), `data/`, `node_modules/`, `.git/`, `_bmad/`, `.claude/`, `.docs/`. No settings or secrets in the image. On start, if test mode is on and the database file is missing, seed first; then start the server. `npm test` stays Docker-free.
- `.env.example` defaults also work for `docker run --env-file .env.example`.

**Never:** test inbox, reminders or "Send påminnelser nå" (3.1); the View-as-helper control (4.2); deployment (1.7); seed on a non-`file:` database or with test mode off; real email; settings baked into the image.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed | test mode, `file:` DB | file reset; organizer, 2 events, shared helpers, tasks in every status; login and links printed | N/A |
| Fixture counts | after seed, any seed day | overview and event-view counts equal `EXPECTED_COUNTS`; Bachelorette "I rute", Wedding has "haster" | N/A |
| Seed day independence | seed with two different fixed days (one in summer time, one in winter time) | identical counts | N/A |
| Invariants | every seeded task | passes `assertFieldInvariant` | N/A |
| Re-seed | run seed twice | same counts, same helper links | N/A |
| Refuse | `TEST_MODE=false`, or `libsql://` URL | no change to any database | clear message, non-zero exit |
| Helper links | open a seeded link | helper page with his tasks | N/A |
| Docker first start | `docker build -t masterplan .`; `docker run --rm --env-file .env.example -p 3000:3000 masterplan` | `/health` 200; test login shows the seeded overview | N/A |
| Docker restart | stop and start the same container | data kept, not re-seeded | N/A |
| No secrets | inspect image | no `.env`, no `data/` | N/A |

</frozen-after-approval>

## Code Map

Reuse the 1.1–1.5 scaffold; don't restructure it.

- `src/services/auth.ts` -- `register(db, clock, ...)` creates the organizer; use it for the test login.
- `src/services/events.ts` -- `createEvent(db, clock, templates, organizerId, input)` builds the template plan (deadlines clamped to the clock's today), so the seed needs `loadTemplates()` from `src/templates/index.ts`.
- `src/services/helpers.ts` -- `addHelperToEvent(..., newToken)` has the token seam for fixed tokens; `TOKEN_FORMAT`.
- `src/services/tasks.ts` -- `apply` (organizer assign/reassign/markDone), `applyAsHelper(db, token, taskId, command, now)` (yes/no/done/cantDo with messages), `updateTask` (sets `changed_since_answer` on Accepted), `addTask`, `deleteTask`.
- `src/services/messages.ts`, `src/services/summaries.ts` -- `overviewSummaries`, `loadEventSummary`, `countNew`; the fixture test reads counts through these.
- `src/domain/taskRules.ts` -- add `assertFieldInvariant` here.
- `src/clock.ts` -- `Clock`, `fixedClock`; the seed needs a clock it can set to past instants.
- `src/config.ts` -- `loadConfig(env)`; the seed command and the container start use it for the guard. `src/server.ts` -- loads `.env` if present, migrates, listens on all interfaces.
- `tsconfig.json` -- `include` lacks `seed`; add it. `package.json` -- add `seed` and a container start script.
- `README.md` -- current short Norwegian "Kom i gang"; rewrite as the examiner guide.

## Tasks & Acceptance

**Execution:**
- [x] `seed/fixture.ts`, `seed/seed.ts`, `seed/run.ts` -- fixture, `seed(db, clock)`, guarded command -- FR-25, AD-11
- [x] `seed/docker-start.ts` -- seed if test mode and the DB file is missing, then start the server -- AD-17
- [x] `src/domain/taskRules.ts` -- `assertFieldInvariant` -- AD-11
- [x] `package.json`, `tsconfig.json` -- `seed` and `start:docker` scripts; include `seed`
- [x] `Dockerfile`, `.dockerignore` -- per AD-17 -- FR-33
- [x] `README.md` -- Docker steps first (build, run with `--env-file .env.example`, open, log in, stop and reset), then the Node Quick Start (Node ≥ 22.12, `npm install`, copy `.env.example`, `npm run seed`, `npm run dev`), test login, seeded helper links, things to try (only what exists after 1.1–1.5), known limitations, `npm test` -- FR-28, FR-33
- [x] `docs/fixtures.md`, `docs/traceability.md`, `docs/cost-and-mock-plan.md` -- counts table matching `EXPECTED_COUNTS`; every FR built so far mapped to its test files, with "manual" rows for the 360 px phone layout and the clipboard; cost plan copied from the architecture folder -- FR-25, FR-28
- [x] `tests/seed.test.ts` -- every matrix row except the Docker rows (counts through the summary services and HTTP, invariants, refuse cases, re-seed, two seed days, a seeded link opens its helper page; a test that `docs/fixtures.md` contains the `EXPECTED_COUNTS` numbers)

**Acceptance Criteria:**
- Given `npm test`, then all tests pass, and `npm run typecheck` is clean.
- Given Docker, when the README's Docker steps are followed on a clean clone, then the app answers on `http://localhost:3000`, the test login works, and the overview shows Bachelorette "I rute" and the Wedding with Urgent tasks; this is checked by running the commands, and the result is recorded in Implementation Notes.

## Implementation Notes

- Extra module `seed/command.ts` holds the guard (`seedRefusal`), `resetAndSeed` and `runSeedCommand(env, clock, log)`, so the refuse cases are testable without spawning; `seed/run.ts` and `seed/docker-start.ts` are thin wrappers. `src/db/client.ts` gained `sqliteFilePath(url)` (used by `openDb`, the guard and the container start).
- The seed schedules its steps as (days before seed day, UTC hour 08–18) and runs them in time order on a movable clock, so every Oslo date is a whole number of days before the seed day. Final counts: Wedding 23 tasks (1/2/3/1/15/1 by status), 2 Urgent, 4 Needs a helper, 2 New replies; Bachelorette 16 tasks (10 Accepted, 6 Done), On track, 1 New reply.
- Re-seed test runs `seed/run.ts` twice as child processes: in one process Windows keeps the SQLite file locked after `close()` (libsql transaction connections), so the reset could not delete it. That test reads counts with the system clock's today (the child seeds with the real date); the counts are day-independent, as the two-seed-day test shows.
- Docker check, 2026-10-25, Docker 29.8.0 on Windows: `docker build -t masterplan .` (from `node:24.21.0-slim`) then `docker run --rm --env-file .env.example -p 3000:3000 masterplan`: the log printed the seed summary, `/health` gave `ok`, login with `kari@example.no` / `hemmelig123` redirected to the overview, which showed the Wedding "2 haster · 4 trenger hjelper" and the Bachelorette "I rute"; a seeded helper link gave 200. With a named container, `docker stop` took about 0.5 s and `docker start` kept the data without re-seeding. The image has no `.env`, an empty `/app/data` and no settings in its environment; it runs as `node`.

- Review patch (pass 1): a failed or interrupted seed deletes the database files on Linux (the container), so a restart re-seeds. On Windows, libSQL keeps the file locked inside the process and the delete fails; this only affects local `npm run seed`, which resets the file on its next run anyway. The delete-on-signal path is not covered by an automated test.
- After the patches: `npm test` 251/251, typecheck clean; image rebuilt and run: `/health` ok, test login shows "2 haster · 4 trenger hjelper" and "I rute".

## Spec Change Log

## Review Triage Log

Review pass 1 (blind, edge-case, verification-gap layers).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | A failed or interrupted first-start seed leaves a partial file that later starts keep (blind, edge) | medium | `docker-start.ts` seeds only when the file is missing; `resetAndSeed` creates it first; SIGTERM exits without cleanup | patch: delete the files on failure or signal during seeding; test |
| 2 | Start-up seed decision untested; the refusal branch is dead; test mode with `libsql://` skips silently (verification, blind, edge) | medium | Outer `if` already requires test mode and a file path; no test imports `docker-start.ts` | patch: exported decision function with a logged skip reason; unit tests |
| 3 | `sqliteFilePath` never tested with the relative `file:./data/local.db` form used by `.env.example` and Docker (verification) | medium | All tests build `file:///` URLs with `pathToFileURL` | patch: unit tests for relative, absolute and `libsql://` |
| 4 | Child-process re-seed test can fail across Oslo midnight (blind, verification, edge) | low | Children seed with the system clock; the parent reads with `systemClock.today()` afterwards | patch: rerun once if the day changed |
| 5 | Seed-day test has no day right after a DST change; refusal test asserts only "Seed avbrutt" (blind) | low | Three days, none after a change; second refusal accepts any reason | patch: add 2026-10-26; assert the reason |
| 6 | Seed comment says 08–18 UTC, code uses hour 19 (edge) | low | Comment and code disagree | patch |
| 7 | Refusal text renders "ikke libsql:." (blind) | low | Template literal splits on ":" | patch |
| 8 | `assertFieldInvariant` misses `accepted_at` null for Unassigned, Open, Declined (blind) | low | AD-2 clears `accepted_at` on reassign and on Accepted → Declined | patch: rule and test |
| 9 | README: seed with a running server on Linux/macOS, demo numbers drift after the seed day, other host port breaks printed links (blind, edge) | low | README warns only about Windows locks; dates are relative to the seed day; `APP_BASE_URL` defaults to port 3000 | patch: three README lines |
| 10 | `docs/fixtures.md` "Ferdig (N av M)" shows only N (blind) | low | Column header promises M | patch |
| 11 | `docs/traceability.md`: helper module listed as a test, FR-33 lacks a pointer, NFR-1 proxy not labelled (blind) | low | As described | patch |
| 12 | Cost plan treats hosting as required (blind) | low | Written before FR-33 made hosting optional | patch: docs copy; architecture copy updated in the same change |
| 13 | No Dockerfile `HEALTHCHECK` (blind) | low | `node:slim` has no curl; README tells the examiner to check `/health` | rejected |
| 14 | No volume example (blind) | low | A named container keeps data, as the README says | rejected |
| 15 | Seed depends on template titles and offsets (blind, edge) | low | A template edit makes the `EXPECTED_COUNTS` tests fail loudly | rejected |
| 16 | `EXPECTED_COUNTS` stores the done count twice (blind) | low | A test keeps them equal | rejected |
| 17 | Siri's token breaks the `-seed-NN` pattern (blind) | low | Links are copied, not typed | rejected |
| 18 | `DATABASE_URL` with a query string or `file::memory:` (edge) | low | Not used by any documented setup | rejected |
| 19 | Stale `-wal`/`-journal` files and sidecar deletion order (edge) | low | libSQL's default journal mode leaves no sidecars after a clean close | rejected |
| 20 | EPERM message suggests a running app when it may be permissions (edge) | low | Rare locally; the message still names the file | rejected |
| 21 | Done-day arithmetic assumes the template order (edge) | low | Same as #15: counts tests fail loudly | rejected |

## Design Notes

- Suggested shape: Wedding 21 days ahead, created 60 days ago; Bachelorette 45 days ahead, created 20 days ago. The template plans are kept; the seed deletes or adds tasks only where needed to hit the targets. Counts are whatever the final seed produces, written once into `EXPECTED_COUNTS` and `docs/fixtures.md`.
- Test login: `kari@example.no` / `hemmelig123`, name Kari. Helpers: Ola, Kim and Siri on both events, plus `per@example.no` (no name) on the Wedding only.
- The container start runs in the same process as the server where practical, so `docker stop` stops the app cleanly.

## Verification

**Commands:**
- `npm test` -- expected: all green
- `npm run typecheck` -- expected: no errors
- `docker build -t masterplan .` then `docker run --rm --env-file .env.example -p 3000:3000 masterplan` -- expected: `curl http://localhost:3000/health` gives `ok`, and login with the test account shows the seeded overview

**Manual checks (if no CLI):**
- Open a seeded helper link in a private window and answer a task; reload the overview.
