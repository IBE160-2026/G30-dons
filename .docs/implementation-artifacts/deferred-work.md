# Deferred Work

The two Story 1.1 items that belong to Story 1.7 (foreign keys on Turso, HTTPS with `TEST_MODE=false`) moved to Story 1.7 in `.docs/planning-artifacts/epics.md` on 2026-10-28.

- source_spec: `.docs/implementation-artifacts/spec-1-1-project-setup-and-organizer-login.md`
  summary: Add a process-level smoke test that starts `src/server.ts` and checks that migrations ran and `/health` answers.
  evidence: Removing `runMigrations` from `server.ts` breaks no test today, because the test helper migrates on its own. Verified manually with `npm start` in Story 1.1.

- source_spec: `.docs/implementation-artifacts/spec-1-2-create-events-from-templates-and-edit-the-plan.md`
  summary: Add a failure-path test proving that `createEvent` leaves no event row when inserting its tasks fails.
  evidence: Replacing `db.transaction` in `src/services/events.ts` with sequential inserts breaks no test today. Forcing a mid-transaction failure needs a seam (for example an injectable `createPlanTasks`); add it with Epic 2's `draftPlan` path.

- source_spec: `.docs/implementation-artifacts/spec-1-3-add-helpers-assign-tasks-and-copy-links.md`
  summary: Check that two simultaneous add-helper requests (double-click, or a fifth and sixth at once) cannot give a 500 from a UNIQUE/PK constraint or link a sixth helper.
  evidence: `addHelperToEvent` selects, counts, then inserts inside `db.transaction`; whether that transaction holds a write lock (`BEGIN IMMEDIATE`) under drizzle + libsql was not verified. Settle with a test firing parallel posts; if it fails, pass `{ behavior: 'immediate' }` and map constraint errors to `helper_already_on_event`. Unverified; would be medium if true.

- source_spec: `.docs/implementation-artifacts/spec-1-3-add-helpers-assign-tasks-and-copy-links.md`
  summary: Run the manual browser check of **Kopier lenke** (clipboard write, "Kopiert!" label, select-field fallback) before Story 1.3 is accepted, or add a DOM test environment.
  evidence: The automated tests only check that `copy.js` is served and contains the expected strings; the repo has no jsdom/happy-dom or browser runner.
