# Deferred Work

- source_spec: `.docs/implementation-artifacts/spec-1-1-project-setup-and-organizer-login.md`
  summary: Verify that foreign keys are enforced on the deployed Turso database (Story 1.7).
  evidence: Local libsql connections report `PRAGMA foreign_keys = 1` by default (checked 2026-10-24), but each Turso request is its own remote stream and could not be checked offline. Settle it with `PRAGMA foreign_keys` against Turso in the 1.7 smoke test; if it is 0, enable it per request or batch. Unverified; would be medium if true.

- source_spec: `.docs/implementation-artifacts/spec-1-1-project-setup-and-organizer-login.md`
  summary: Add a process-level smoke test that starts `src/server.ts` and checks that migrations ran and `/health` answers.
  evidence: Removing `runMigrations` from `server.ts` breaks no test today, because the test helper migrates on its own. Verified manually with `npm start` in Story 1.1.

- source_spec: `.docs/implementation-artifacts/spec-1-1-project-setup-and-organizer-login.md`
  summary: Document in the Story 1.7 deploy guide that `TEST_MODE=false` needs HTTPS (or a proxy sending `X-Forwarded-Proto: https`), otherwise login and register return 500.
  evidence: cookie-session refuses to set a secure cookie on a plain-HTTP request. Render sends the header and `trust proxy` is set, so only a local production-mode run hits it.

- source_spec: `.docs/implementation-artifacts/spec-1-2-create-events-from-templates-and-edit-the-plan.md`
  summary: Add a failure-path test proving that `createEvent` leaves no event row when inserting its tasks fails.
  evidence: Replacing `db.transaction` in `src/services/events.ts` with sequential inserts breaks no test today. Forcing a mid-transaction failure needs a seam (for example an injectable `createPlanTasks`); add it with Epic 2's `draftPlan` path.

- source_spec: `.docs/implementation-artifacts/spec-1-3-add-helpers-assign-tasks-and-copy-links.md`
  summary: Check that two simultaneous add-helper requests (double-click, or a fifth and sixth at once) cannot give a 500 from a UNIQUE/PK constraint or link a sixth helper.
  evidence: `addHelperToEvent` selects, counts, then inserts inside `db.transaction`; whether that transaction holds a write lock (`BEGIN IMMEDIATE`) under drizzle + libsql was not verified. Settle with a test firing parallel posts; if it fails, pass `{ behavior: 'immediate' }` and map constraint errors to `helper_already_on_event`. Unverified; would be medium if true.

- source_spec: `.docs/implementation-artifacts/spec-1-3-add-helpers-assign-tasks-and-copy-links.md`
  summary: Run the manual browser check of **Kopier lenke** (clipboard write, "Kopiert!" label, select-field fallback) before Story 1.3 is accepted, or add a DOM test environment.
  evidence: The automated tests only check that `copy.js` is served and contains the expected strings; the repo has no jsdom/happy-dom or browser runner.
