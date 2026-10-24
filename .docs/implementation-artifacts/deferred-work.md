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
