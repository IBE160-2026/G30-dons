---
title: 'Story 5.1: Build the Porselen design'
type: 'feature'
created: '2026-11-10'
status: 'in-progress'
baseline_commit: '83c383e116b8a986990b4c5da961bfb831b8ca97'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/.docs/planning-artifacts/ux-designs/ux-MasterPlan-2026-11-10/DESIGN.md'
  - '{project-root}/.docs/planning-artifacts/ux-designs/ux-MasterPlan-2026-11-10/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app works end to end but looks cold, impersonal and cluttered: every task row is an open form, tasks repeat between panels and the list, and helper links are raw URLs. This story is the course's design part, due 12 November 2026.

**Approach:** Build the UX design «Porselen» (`DESIGN.md` for the look, `EXPERIENCE.md` for behavior and copy) across every page, with no new features: the same routes, rules and data. Lock the result with a new architecture rule and an automated test, so the look cannot drift.

**Decisions (proposed 2026-11-10, approved by the user 2026-11-10):**
- **D1 Double submit on «Nytt arrangement».** `GET /events/new` puts a random one-time token in a hidden field. `POST /events` keeps an in-process map from token to the pending `createEvent` promise: a second request with the same token waits for the first and redirects to the same event, so the AI is called once and one event is created. Entries expire after 10 minutes. A request without a token is handled as today. A small external script (`public/submit-once.js`) disables the button and shows «Lager utkast …». No migration. Limit: the map lives in one process, which is what the app runs as (NFR-5); a restart mid-draft loses only the dedup, not data.
- **D2 Edit box routes stay separate.** The edit box holds sibling forms on the existing routes: title and deadline with «Lagre» (`POST /tasks/:id`), helper select with «Gi oppgaven» (`POST /tasks/:id/assign`), «Marker som ferdig» (`/done`) and «Slett oppgaven» (`/delete`); «Avbryt» is a link back. No combined route, so every status change still goes through `tasks.apply` alone (AD-2), and the existing route tests stay valid.
- **D3 Week groups exclude «Trenger deg nå».** «Denne uka» (today to Sunday) and «Neste uke» (next Monday to Sunday) list tasks that are not Done and are not already in «Trenger deg nå», so no task is shown twice in the top cards.
- **D4 Event card edge cases (deferred finding §4).** A past event shows «Var ‹dato›», no status pill, and stays last (as today). An event today shows «I dag». An event with no tasks shows «Ingen oppgaver ennå» instead of «0 av 0 ferdig» and no bar.
- **D5 Narrow screens (deferred finding §3).** The tab row wraps onto more lines; nothing is hidden or scrolled. At 360 px a task row has two lines: title and pill, then date and «Endre».
- **D6 Helper link without JavaScript.** Each helper row has «Kopier lenke» and a `<details>` «Vis lenken» with the read-only field. `copy.js` copies and announces «Lenken er kopiert» in a `role="status"` line; without clipboard access it opens the details and selects the field.
- **D7 «Gi oppgaven» without a helper** re-renders the event view (422) with «Velg en hjelper.» under that select and focus on it, instead of today's 404. It has its own test.
- **Order and cut rule (user, 2026-11-10).** The spec stays whole, and the work follows a fixed order: (1) tokens, fonts and components; (2) every page uses them; (3) locked with the rule and the test; (4) the restructure of the event view and the helper page, with D3–D7; (5) D1 last. Steps 1–3 are the design deliverable due 12 November 2026. If time runs short, steps 4–5 move to a new story, with the reason recorded in Spec Change Log, `epics.md` and `docs/ki-logg.md`.

## Boundaries & Constraints

**Always:**
- Follow `DESIGN.md` and `EXPERIENCE.md`; where a mock differs, the spines win (EXPERIENCE → Mock deviations).
- `public/styles.css` starts with `:root` custom properties named after the `DESIGN.md` tokens (`--color-navy`, `--radius-lg`, `--space-4`, …), split into single values, plus `--focus-ring` and the flash tokens. Outside `:root`, colors, font families, radii and spacing use only `var(--…)`.
- Lora, Source Sans 3 and Dancing Script as WOFF2 (latin subset) in `public/fonts/`, with `OFL.txt` per family, loaded with `@font-face` and `font-display: swap`.
- New pure helpers in `src/domain/`: `osloHour(timestamp)` in `dates.ts`, `greeting(hour)` and `weekGroups(tasks, today, exclude)` in a new `domain/overviewText.ts` or next to `status.ts`. Views stay logic-free.
- Every page uses the new layout: login, register, overview, new event, event view, helper page, reminder view, invalid link, test inbox, 404 and error.
- Counted text uses the singular for one.

**Never:**
- No new features, data, migrations or writes; no change to `domain/status.ts` rules or `tasks.apply`.
- No inline JavaScript, inline `style` attributes, or fonts and images from third parties.
- No new place that marks replies seen; only `?panel=messages` does (AD-15).
- No dark mode, emoji, or extra ornament beyond the framed card, ❦ and the header stripe.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|---|---|---|
| Greeting | 09:59 / 10:00 / 16:59 / 17:00 / 04:59 Oslo | «God morgen» / «God dag» / «God dag» / «God kveld» / «God kveld» |
| Greeting across DST | 2026-03-29 00:30Z and 01:30Z | Oslo hour 1 and 3 |
| Week groups | Today Tuesday 10 Nov; tasks due 10, 15, 16, 22, 23 Nov | «Denne uka»: 10, 15; «Neste uke»: 16, 22; 23 in neither |
| Week groups | Today Sunday 15 Nov | «Denne uka»: only 15; «Neste uke»: 16–22 |
| Week groups | A due task already in «Trenger deg nå», or Done | In neither group |
| Event card | Past / today / no tasks | «Var ‹dato›», no pill / «I dag» / «Ingen oppgaver ennå», no bar |
| Double submit | Two POSTs with the same token while drafting | One event, one AI call, both redirect to it |
| Double submit | POST without a token | Creates the event as today |
| Edit box | `?endre=<id>` of this event / another event / not a number | Box open under that task / full page without a box / full page without a box |
| Assign | «Gi oppgaven» with no helper | 422, «Velg en hjelper.» under the select |
| Messages | `GET /events/:id` with 2 new replies | Preview shown, still «2 nye» after reload; only `?panel=messages` marks them seen |
| Helper banner | 1 / 3 / 0 unanswered | «1 oppgave venter …» / «3 oppgaver venter …» / no banner |

</frozen-after-approval>

## Code Map

- `public/styles.css` (608 lines) -- rewrite from tokens; keep the `/* helper page` … `/* end helper page */` markers that `tests/helperPage.test.ts:131` reads.
- `src/views/*.ejs`, `src/views/partials/{top,helper-top,event-tabs,bottom}.ejs` -- every page; `event.ejs` (196 lines) is the main restructure (today: info box, panels, a form per task).
- `src/routes/organizer/events.ts` -- `renderEvent` builds `panels`; add the top cards, week groups, `?endre` and the assign error (D7); `POST /events` gets the token (D1). `STATUS_LABELS` and `ACTION_LABELS` stay.
- `src/routes/organizer/overview.ts`, `summaryText.ts` -- overview cards, greeting, «om N dager», D4 texts; reuse `overviewStatusText`, `newRepliesText`.
- `src/routes/helper.ts` -- header text (line ~100), banner count, grouping; keep the AD-6 headers and the `view=accepted` filter.
- `src/domain/dates.ts` -- add `osloHour`; reuse `osloDate`, `addDays`, `formatDateNb`.
- `src/domain/status.ts` -- read only: `needsHelper`, `urgent`, `eventSummary` (`past`, `daysToEvent`).
- `public/copy.js` -- D6; keep it a classic script with `'use strict'`.
- `.docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md` -- add AD-18 «Visual tokens».
- Tests that check old texts: `helperPage.test.ts` (lines 114, 124, 187, 201), `seed.test.ts:237`, `summaries.test.ts` (panel classes and «Vis svar», lines 227–410), `helpers.test.ts:187–241` (copy row), `events.test.ts:184` (tab class).

## Tasks & Acceptance

**Execution** (fixed order; each step starts with its tests, and each step is committed before the next starts):

*Steps 1–3: the design deliverable, due 12 November 2026.*
- [x] **1. Tokens, fonts and components.** `public/fonts/*` (WOFF2 and `OFL.txt`), `public/styles.css` -- `:root` tokens, `@font-face`, and the shared components from `DESIGN.md` (header, tabs, buttons, inputs, pills, flash, cards, framed card, empty state, plain page).
- [ ] **2. Every page uses them.** `src/views/partials/*`, `login.ejs`, `register.ejs`, `overview.ejs`, `event-new.ejs`, `event.ejs`, `helper.ejs`, `helper-invalid.ejs`, `test-inbox.ejs`, `404.ejs`, `error.ejs` -- the new classes and layout on the current content and structure; remove the old CSS. Update the tests in the Code Map whose markup changes.
- [ ] **3. Locked with rule and test.** `tests/designTokens.test.ts` (AC 1), AD-18 in `ARCHITECTURE-SPINE.md`, and the keyboard test and 360 px check for the restyled pages recorded in `docs/traceability.md`.

*Steps 4–5: moved to a new story if time runs short.*
- [ ] **4. Restructure and D3–D7.** `src/domain/dates.ts`, new `src/domain/overviewText.ts` (`osloHour`, `greeting`, `weekGroups`), `src/routes/organizer/overview.ts`, `summaryText.ts`, `events.ts`, `src/routes/helper.ts`, `overview.ejs`, `event.ejs`, `helper.ejs`, `public/copy.js` -- greeting, framed event cards with D4, «Trenger deg nå», Fremdrift with week groups (D3), helper rows (D6), Meldinger preview, read-only rows with `?endre` (D2, D5), the assign error (D7), the helper page and reminder view. Tests: `tests/overviewText.test.ts`, `tests/eventView.test.ts` (with the D7 test), and the updates in the Code Map.
- [ ] **5. D1 last.** `src/routes/organizer/events.ts`, `event-new.ejs`, `public/submit-once.js` -- the one-time token and the waiting state. Test: `tests/createOnce.test.ts`.

*After the steps:* README screenshots and «Ting å prøve», `docs/traceability.md`, `sprint-status.yaml`.

**Acceptance Criteria** (each names the test that proves it):
1. Given `DESIGN.md` and `public/styles.css`, then every color token exists in `:root` with the same value, no color literal appears outside `:root`, and no view has a `style` attribute. *Test:* `designTokens.test.ts`.
2. Given the matrix rows for greeting and week groups, then `greeting(osloHour(t))` and `weekGroups` return them. *Test:* `overviewText.test.ts`.
3. Given the seed data, then the overview shows the greeting and framed cards, and the D4 texts hold for past, today and empty events. *Test:* `summaries.test.ts`.
4. Given the event view, then «Trenger deg nå», Fremdrift with week groups, helper rows with «Kopier lenke» and no visible URL, the Meldinger preview, and read-only task rows are shown; `?endre` opens one box with «Marker som ferdig» for any task not Done; the preview marks nothing seen. *Test:* `eventView.test.ts`, `summaries.test.ts`.
5. Given «Gi oppgaven» posted with no helper chosen, then the response is 422, «Velg en hjelper.» is shown under that task's select, and the task is unchanged (D7). *Test:* `eventView.test.ts`.
6. Given two concurrent `POST /events` with one token, then one event is created and both redirect to it. *Test:* `createOnce.test.ts`.
7. Given Ola's link, then the neutral header, greeting, banner with singular, grouping, «Svar ønskes», «Ja, jeg tar den» and the stale-answer message are shown; the helper styles keep no width above 360 px and buttons at least 48 px. *Test:* `helperPage.test.ts`.
8. Given `npm test`, `npm run typecheck` and `npm run lint`, then all are green and no test uses the network.

## Definition of Done

From `CLAUDE.md`. The story is done when:

1. Acceptance criteria 1–8 are met (or, if steps 4–5 were moved, 1, 7 and 8 for the restyled pages, and the move is recorded), and `docs/traceability.md` maps each to its code and tests.
2. The tests were written first, and `npm test` and `npm run typecheck` are green.
3. Input is validated (`?endre`, the create token, the assign helper), errors give understandable Norwegian messages, and no secret is added.
4. **Keyboard test, done manually and recorded with date in `docs/traceability.md`:** on the overview, event view (with an open edit box), new event, helper page and test inbox, every control is reachable with Tab in reading order, focus is always visible, `<details>` open with Enter/Space, and every action works without a mouse.
5. **360 px check, done manually and recorded with date in `docs/traceability.md`:** the same pages at 360 px wide have no sideways scrolling, tabs wrap, task rows follow D5, and buttons are easy to tap.
6. Every page uses the new stylesheet; AD-18 is in `ARCHITECTURE-SPINE.md`; no dead CSS, views or leftovers from the old layout.
7. README (with new screenshots) and planning docs are updated; changes from this spec are in Spec Change Log; `sprint-status.yaml` is `done` after merge.
8. Work on `story/5-1-build-the-porselen-design` in small commits, merged through a pull request that says how it was tested and which faults were found in AI-generated code; each corrected, rejected or clarified AI suggestion is in `docs/ki-logg.md`; `npm run lint` passes before each commit.

## Implementation Notes

**Step 1 (2026-11-10).**
- **Test first:** `tests/fonts.test.ts` checks that the four `@font-face` rules (Lora 400, Source Sans 3 400 and 600, Dancing Script 500) point to files served from `/fonts/` as `font/woff2`, that each family has its `OFL.txt`, and that the stylesheet loads nothing from another origin. Three of its four tests failed before the fonts existed.
- **Fonts:** latin-subset WOFF2 files and the OFL licence from the npm packages `@fontsource/lora` 5.3.0, `@fontsource/source-sans-3` 5.3.1 and `@fontsource/dancing-script` 5.3.0, copied into `public/fonts/<family>/`. No npm dependency was added. Lora has only weight 400, because `DESIGN.md` says Lora is never bold.
- **Stylesheet:** `public/styles.css` now starts with `@font-face`, the `:root` tokens named after `DESIGN.md` (`--color-*`, `--font-*`, `--type-*`, `--radius-*`, `--space-*`, and single-value component tokens such as `--focus-ring-*`, `--flash-*` and `--card-frame-inset`), the base styles and the shared components (header with stripe, tabs that wrap, cards, `card-framed` with ❧, `card-action`, buttons, inputs, pills, progress bar, flash, label caps, empty state, plain page). Ornaments use `content: '❧' / ''`, so screen readers skip them.
- **Bridge to step 2:** the page rules from before the redesign are kept below the components. The old variable names (`--bg`, `--accent`, …) are temporary aliases for the new tokens, so every page already uses the Porselen colors and fonts without broken layout. Step 2 replaces those rules and removes the aliases.
- **Verified:** `npm test` (21 files, 344 tests), `npm run typecheck` and `npm run lint` are green.

## Spec Change Log

## Review Triage Log

## Design Notes

AD-18 (to add): «Colors, font families, radii and spacing in `public/styles.css` come only from the custom properties in `:root`, which mirror the `DESIGN.md` tokens by name. Views have no `style` attributes. `tests/designTokens.test.ts` enforces it.»

## Verification

**Commands:**
- `npm test` -- all tests pass, none uses the network
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors

**Manual checks:** the keyboard test and the 360 px check in Definition of Done 4–5, recorded in `docs/traceability.md`.
