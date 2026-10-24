---
review: currency / reality-check
target: ARCHITECTURE-SPINE.md (+ .memlog.md)
date: 2026-10-24
method: live npm registry queries, vendor docs fetched today, and a throwaway smoke-test install of the exact Stack versions (scratchpad, not the project)
---

# Currency Review — MasterPlan v1 Architecture Spine

## Verdict

All 15 pinned package versions match npm `latest` today and work together in a real install. **But one hosting decision fails against current vendor docs:** Render free web services block outbound SMTP ports 465 and 587, so "Nodemailer + Gmail SMTP from Render free" cannot send mail. Four smaller gaps also need a fix: Node 22 versus Render's default and Node 24, the cron-job.org 30 s timeout versus Render's ~1 min wake, the missing Turso auth token setting, and the TS 7 tsconfig requirements.

## 1. Stack row versions (npm registry, `https://registry.npmjs.org/<pkg>/latest`, 2026-10-24)

| Package | Spine | npm latest | Engines / peers | Status |
|---|---|---|---|---|
| express | 5.3.0 | 5.3.0 (2026-10-09) | node >= 18 | OK |
| ejs | 7.0.2 | 7.0.2 (2026-10-18) | — | OK, but new major; 7.0.1 only 2026-10-04, release notes empty |
| drizzle-orm | 0.45.4 | 0.45.4 (`rc` = 1.0.0-rc.5) | peer @libsql/client >= 0.10 | OK |
| drizzle-kit | 0.31.11 | 0.31.11 (`rc` = 1.0.0-rc.5) | deps tsx ^4.21, esbuild ^0.25 | OK |
| @libsql/client | 0.18.0 | 0.18.0 | — | OK |
| zod | 4.6.7 | 4.6.7 | — | OK |
| typescript | 7.0.2 | 7.0.2 (GA 2026-07-08) | — | OK, see §2.3 |
| tsx | 4.23.15 | 4.23.15 | esbuild ~0.28 | OK |
| vitest | 5.0.5 | 5.0.5 | node ^22.12 \|\| ^24 \|\| >=26; **peer vite (not optional)** | OK; vite 8.3.5 gets auto-installed |
| supertest | 7.3.1 | 7.3.1 | — | OK |
| cookie-session | 2.1.1 | 2.1.1 (2025-07-17) | — | OK (stable, not abandoned) |
| helmet | 8.3.0 | 8.3.0 | node >= 18 | OK |
| nodemailer | 10.2.1 | 10.2.1 | node >= 20 | OK as a library; see §3.1 for transport |
| @anthropic-ai/sdk | 1.3.0 | 1.3.0 | peer zod ^3.25 \|\| ^4 | OK |
| Node.js | 22.x (>= 22.12) | 22.23.4 (Maintenance LTS) | — | Works, but see §3.2 |

The Stack table leaves out the `@types/*` packages the build needs: `@types/node@22` (npm `latest` is 26.x, so pin to the Node major), `@types/express@5.0.6`, `@types/cookie-session@2.0.49`, `@types/nodemailer@8.0.2`, `@types/supertest@7.2.1`. All of them have `ts7.0` dist-tags. Nodemailer 10 still has no bundled types, so `@types/nodemailer` is needed.

## 2. Compatibility checks (smoke test with the exact pinned versions, Node 24.21 local, npm 11.19)

The smoke test installed every Stack package at its pinned version. A tiny app used Express 5 with `app.set('view engine','ejs')`, an EJS `include`, helmet, cookie-session, a Drizzle sqlite table through `drizzle-orm/libsql` on `file:./data/local.db`, a zod v4 schema with `zodOutputFormat`, and a Nodemailer transport.

### 2.1 Express 5 + EJS 7 view engine: PASS
`res.render('hi', …)` and `<%- include('part', {x:1}) %>` rendered correctly through supertest. EJS 7 ships CJS (`main`) plus ESM (`exports.import`), and Express's `require('ejs').__express` path still works. EJS 7's release notes say nothing, so pin it exactly. If a template feature misbehaves, fall back to `ejs@6.0.1`.

### 2.2 Drizzle 0.45.4 + @libsql/client 0.18 + drizzle-kit 0.31.11 (turso dialect): PASS
`drizzle-kit generate` and `drizzle-kit migrate` worked against `file:./data/local.db` with `dialect: 'turso'`, and inserts, selects and `.returning()` worked at runtime. Two things to watch:
- Drizzle's Turso get-started docs now tell you to install `drizzle-orm@rc` / `drizzle-kit@rc` (1.0 RC). Agents that follow the live docs may pull in v1 APIs, so the spine should say "stay on 0.45.x / 0.31.x, do not use the `@rc` tag".
- drizzle-kit 0.31.11 still depends on the deprecated `@esbuild-kit/esm-loader` ("Merged into tsx") and an older esbuild 0.18/0.25. This is harmless, but expect deprecation warnings.

### 2.3 tsx 4 + TypeScript 7 (native Go compiler): PASS, with conditions
- tsx runs code through esbuild 0.28 and never loads the `typescript` package, so TS 7 has no effect on it. `tsx` import of the app: OK. Vitest 5 transforms TS itself: OK.
- `tsc --noEmit` under TS 7.0.2 **passes only with `skipLibCheck: true`**. Without it there are 59 errors inside `drizzle-orm/*.d.ts` (gel / mysql / singlestore declarations). The same 59 errors appear with TypeScript 6.0.3, so this is Drizzle's problem, not TS 7's. Drizzle's inferred types were checked correctly in user code: the enum literal on `status` and `parsed_output` typing.
- TS 7 changed defaults and removed options: strict on by default; `baseUrl`, `moduleResolution: node/node10`, `target: es5` and `esModuleInterop: false` removed; `types` no longer auto-includes every `@types/*`. The tsconfig must therefore set `"types": ["node"]` and `module`/`moduleResolution: "nodenext"` (or `"bundler"`).
- TS 7.0 has no programmatic Compiler API. Any tool that `import`s `typescript` breaks: ts-node, typescript-eslint, ts-jest, typedoc. The spine uses none of them, but if ESLint with typescript-eslint is added later, it needs the `@typescript/typescript6` compatibility alias.

### 2.4 Vitest 5 on Node 22: PASS by engines
The engines field allows `^22.12.0`. The run itself happened on Node 24 locally and was not repeated on 22. `vite` is a required peer that npm installs automatically. Listing `vite@8.3.5` as a devDependency makes this explicit.

### 2.5 cookie-session 2.1.1 + Express 5: PASS
The session counter persisted across requests through `request.agent`, and `@types/cookie-session` augments `req.session` under Express 5 types.

### 2.6 @anthropic-ai/sdk 1.3.0 `messages.parse` + `zodOutputFormat` + zod 4: PASS
- `import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'`. The helper internally imports `zod/v4`, and the peer range is `zod ^3.25 || ^4`. The call typechecks and is GA (not beta): `client.messages.parse({ …, output_config: { format: zodOutputFormat(Schema) } })` → `message.parsed_output`. `output_format` is deprecated, so stories must use `output_config.format`.
- Model `claude-haiku-5-5` exists. The models page lists it at "From $0.10 / input MTok, From $0.50 / output MTok", retirement not sooner than 2027-10-07, matching the memlog. Haiku 5.5 uses adaptive thinking with default effort `medium`. Thinking tokens bill as output, so the "~$0.06 per 100 drafts" estimate may be low. Set `effort: "low"` (or turn thinking off if allowed) and let `max_tokens` cap the cost.

### 2.7 Install-script note (npm 11.19)
npm now warns that esbuild postinstall scripts are "not yet covered by allowScripts". Everything still ran, because esbuild uses platform optional deps. The README should mention this so the examiner isn't alarmed by the warning.

## 3. Services and runtime

### 3.1 Render free web service: still free, but **blocks SMTP** — CRITICAL
- Render's docs (render.com/docs/free) say the free tier still exists: it spins down after 15 min idle, takes about 1 min to wake, gives 750 instance hours per month, and has an ephemeral filesystem.
- The same page says: "Free web services can't send outbound network traffic on ports `25`, `465`, or `587`, commonly used for SMTP." **Nodemailer → smtp.gmail.com:465/587 from Render free will hang or time out.** Gmail offers no other submission port.
- Fix options, cheapest first:
  - (a) Keep Nodemailer for local use and add an HTTPS email API transport for deployment: Brevo or Mailjet free tier with a single verified sender address, or the Gmail API `users.messages.send` over 443. AD-9's `mail/send` boundary already isolates this. The Gmail API needs an OAuth app in **Production** status, because Google says refresh tokens for "Testing" apps expire in 7 days. Brevo and Mailjet free limits and the single-sender rules were **not confirmed today**, so check them before choosing.
  - (b) Use a paid Render instance (SMTP is allowed off the free tier; only port 25 is blocked on all services).
  - (c) Use a host that allows outbound 587.
- Card requirement: Render's docs and pricing page don't say whether a card is needed. Community threads report anti-fraud card checks (a $1 verification hold) even for free services. Treat a card as possibly required, and keep the examiner path (local, TEST_MODE) free of it, as the memlog already intends.

### 3.2 Node 22 LTS: still supported, but no longer the best default
- From the nodejs/Release schedule.json: v22 has been in Maintenance since 2025-10-21 and reaches **EOL 2027-04-30**. v24 is Maintenance LTS until 2028-04-30. v26 becomes Active LTS on **2026-10-28**, four days from now.
- Render's default for new services since 2026-10-21 is **Node 24.22.1**. Unless the version is pinned, Render will run 24 while the spine says 22. Render asks for an upper bound in `engines`.
- Suggested fix: move to Node 24 LTS (`"engines": {"node": ">=24.11 <25"}` plus a `.node-version` file with `24`) and `@types/node@24`. Everything in the Stack supports 24, and the smoke test ran on 24. Or keep 22 and pin it explicitly with `.node-version` = `22`.

### 3.3 Turso free tier: OK
turso.tech/pricing: $0, "Start free, no credit card required", 100 DBs, 5 GB, 500M rows read and 10M rows written per month, 1-day PITR. The page says nothing about pausing idle databases. Gap: the deployed URL (`libsql://…`) needs an **auth token**, but AD-10's setting list has only `DATABASE_URL`. Add `DATABASE_AUTH_TOKEN`, optional for `file:`, and pass it to `createClient` and `drizzle.config.ts`.

### 3.4 cron-job.org: free, POST + custom headers OK, but **30 s timeout**
- The site says it is "absolutely free … financed entirely by voluntary donations". Jobs can set "the request method, headers and body data", so POST with `X-Cron-Secret` works. Jobs run at most once a minute, and there is no limit on the number of jobs.
- The FAQ says a job "does not finish after 30 seconds, it will timeout", that there are no retries, and that a job is auto-disabled after more than 25 consecutive failures. A Render free cold start takes about 1 minute, so the daily POST will often time out, and whether the request still reaches the app is not guaranteed.
- Fix: add a second job (e.g. GET `/healthz` 2–3 min before the reminder POST) to wake the service, or schedule the POST twice a few minutes apart. AD-7 is already idempotent through the `(task_id, accepted_at)` unique key, so double runs are safe. Also make `/internal/reminders/run` respond quickly.

### 3.5 Gmail app passwords: still supported (moot on Render free)
support.google.com/accounts/answer/185833 still offers app passwords and has no deprecation notice. They require 2-Step Verification. They are "not recommended", are unavailable for security-key-only, Advanced Protection or Workspace-restricted accounts, and are revoked when the account password changes. This works for local or non-Render SMTP, but §3.1 blocks it on the chosen host.

## 4. Items asserted but not independently confirmed today
- Render card requirement (see §3.1).
- Brevo and Mailjet free quotas and single-sender rules: Brevo's pricing page did not render.
- Behaviour on Node 22 specifically: the smoke test ran on Node 24.21.
- The memlog's "Gmail SMTP ~500/day" figure was not re-checked.

## Sources
- npm registry: `https://registry.npmjs.org/{express,ejs,drizzle-orm,drizzle-kit,@libsql/client,zod,typescript,tsx,vitest,supertest,cookie-session,helmet,nodemailer,@anthropic-ai/sdk,vite,esbuild}/latest` and `/-/package/<pkg>/dist-tags`, queried 2026-10-24
- Smoke test install (exact versions), 2026-10-24: tsc 7.0.2, tsc 6.0.3, vitest run, tsx, drizzle-kit generate/migrate
- Node schedule: https://raw.githubusercontent.com/nodejs/Release/main/schedule.json; releases: https://nodejs.org/dist/index.json
- Render free tier: https://render.com/docs/free
- Render Node default: https://render.com/docs/node-version
- Render card reports: https://community.render.com/t/free-but-credit-card-first/24630, https://feedback.render.com/features/p/credit-card-information-is-required-while-your-public-offer-says-its-not
- Render SMTP (community): https://community.render.com/t/outlook-smtp-server/13185
- Turso pricing: https://turso.tech/pricing
- Drizzle + Turso: https://orm.drizzle.team/docs/get-started/turso-new
- cron-job.org: https://cron-job.org/en/ and https://cron-job.org/en/faq/
- Gmail app passwords: https://support.google.com/accounts/answer/185833
- Google OAuth refresh-token expiry: https://developers.google.com/identity/protocols/oauth2
- Anthropic SDK helpers: https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md
- Anthropic models: https://platform.claude.com/docs/en/models/overview
- TypeScript 7 changes: https://infoq.com/news/2026/08/typescript-7-released/, https://noqta.tn/en/tutorials/typescript-7-project-corsa-go-compiler-migration-guide-2026
- EJS releases: https://github.com/mde/ejs/releases
