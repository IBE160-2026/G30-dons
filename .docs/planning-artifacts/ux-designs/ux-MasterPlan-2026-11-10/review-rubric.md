# Spine Pair Review — MasterPlan

Reviewed 2026-11-10 15:10 (+0100). Files: `DESIGN.md`, `EXPERIENCE.md`, `.memlog.md`, `.working/*.html`, `imports/`, the four sources in frontmatter, `src/views/`, `src/routes/paths.ts`.

## Overall verdict

The pair is lean, well-shaped and visually decisive: every colour has a hex, every prose token reference resolves, all text contrast pairs pass AA (verified), and the "Plan impact" section honestly flags deviations from the PRD. As a downstream contract, though, it has load-bearing holes. UJ-4 (the examiner) has no flow. FR-16 "organizer marks any task Done" silently disappears from the new task list. The Meldinger "seen" semantics (FR-20, AD-15) are contradictory. The core helper task card has no visual spec. The "Open items" list that is supposed to override the mocks does not exist. Fix the five high findings before architecture or story work starts; the rest can be done in the same update pass.

## 1. Flow coverage — thin

Checked: UJ-1…UJ-4 (PRD §3) and the FRs they realize against the four Key Flows (protagonist, numbered steps, climax, failure path). Mapping found: Flow 1 ≈ UJ-3, Flow 2 ≈ UJ-2 steps 1–3, Flow 3 ≈ UJ-2 steps 5–6, Flow 4 ≈ UJ-1 steps 2–3. All four have a protagonist, numbered steps and a bold climax. Only Flows 1 and 2 have a failure path.

### Findings
- **high** UJ-4 (John, the examiner, test mode) has no Key Flow. Testinnboks, «Send påminnelser nå», the mock-AI notice (FR-23) and the test-mode header link appear only as an IA row and one empty state, yet UJ-4 is the grading path (EXPERIENCE.md → Key Flows). *Fix:* add "Flow 5 — John runs the examiner check (UJ-4)": Docker start, log in as the seeded organizer, overview shows Wedding urgent and Bachelorette on track, open a seeded helper link, answer, see the overview update, create an event and see the mock-AI notice, «Send påminnelser nå», read the reminder in Testinnboks. Climax: the whole loop is seen in minutes. Failure: Testinnboks reached with test mode off (refused).
- **high** FR-16 (Organizer marks Done, Must) is lost for most tasks. In the new design «Marker som ferdig» exists only on *Urgent* rows in «Trenger deg nå». Task-list rows are read-only with «Endre», and the edit box offers only Lagre / Avbryt / Slett oppgaven. UJ-3 step 4 ("She does the second task herself and marks it Done", a Can't be done task) cannot be completed: that task lands in a delegation row with only a select and «Gi oppgaven» (EXPERIENCE.md → Component Patterns: «Trenger deg nå» card, Task list, Edit box (variant A)). *Fix:* add «Marker som ferdig» to the edit box and to delegation rows, or list the removal in Plan impact with a reason.
- **medium** The flows are not tied to UJ IDs, and UJ-1 steps 4–6 (add, change or delete tasks; add up to five helpers; share links) are covered only in fragments. No flow adds a helper («+ Legg til hjelper») or edits or deletes a task through the edit box (EXPERIENCE.md → Key Flows). *Fix:* tag each flow title with its UJ, and extend Flow 4 past the climax (or add a short flow) to cover adding a helper, using «Endre» and assigning.
- **medium** Failure paths are missing where they apply. Flow 2 has no "No" branch (Declined with a message). Flow 3 has no Can't be done branch and no stale-page refusal after a reassignment (FR-12). Flow 4 has no form-validation failure and no slow-AI path (NFR-6, up to 30 s) (EXPERIENCE.md → Flows 2–4). *Fix:* add one failure line to each of Flows 3 and 4, and the decline branch to Flow 2.
- **low** Flow 4 lacks the context tag (time and device) that Flows 1–3 carry. *Fix:* add one, e.g. "(Sunday afternoon, laptop)".

## 2. Token completeness — adequate

Checked: 20 colour, 9 typography, 4 rounded, 10 spacing and 18 component tokens. Prose references in DESIGN.md: colors.background, surface, navy, link, porcelain, stripe, brass, progress, line, urgent, urgent-bg, on-track, on-track-bg, waiting-bg, error, field-border, muted, soft; typography.label-caps; spacing.page-max, side-column, margin-mobile, 1–6, touch-min; rounded.sm, md, lg, full; components.header-trim, card, card-framed, card-action, avatar. EXPERIENCE.md references only `{colors.error}`. **All resolve; every colour has a hex.** Contrast recomputed: every stated pair is correct.

### Findings
- **medium** The typography tokens are not mapped to roles. `display`, `headline`, `logo`, `body-strong`, `meta` and `greeting-mobile` are never referenced in prose, so a consumer cannot tell which token sets the page title, event name, card heading, helper-page title at 360 px, counts or dates (DESIGN.md → Typography). *Fix:* add a role → token list, e.g. "Page title / event name: `{typography.display}`, card heading: `{typography.headline}`, dates and counts: `{typography.meta}`, helper greeting: `{typography.greeting-mobile}`".
- **medium** The component tokens are not atomic, so a resolver cannot flatten them: `border: 1px solid {colors.navy}`, `height: 6px (overview), 10px (event view)`, `cornerOrnament: '❧ in {colors.brass}'`, `pattern: repeating stripe …`, `innerRule: …, inset 6px`, `minHeight-helper`, `extends`. Components that the prose relies on have no tokens at all: flash, focus ring (2 px navy, prose only), helper task card frame, banner (DESIGN.md frontmatter → components). *Fix:* split values into single properties (`borderColor`, `borderWidth`), split progress-bar into `progress-bar` and `progress-bar-large`, and add `flash`, `focus-ring`, `card-ask` (helper task card) and `banner` entries.
- **low** `{colors.porcelain}` is defined but no component uses it (header-trim uses `stripe`). `{colors.text}` is never referenced. "Small boxes `{rounded.md}`" names no component (DESIGN.md → Colors, Shapes). *Fix:* bind porcelain to a use or drop it; name what `rounded.md` is for.
- **low** Some load-bearing pairs pass but are not stated: error on white 6.65:1 and on soft 5.92:1, link on ivory 5.98:1, in-progress pill (navy on soft) 10.7:1, danger button (urgent on white) 5.59:1, and field-border on soft 3.09:1 (the edit box, closest to the 3:1 floor) (DESIGN.md → Colors, contrast paragraph). *Fix:* add them to the "Checked" list, and call out field-border on soft as the tight one.

## 3. Component coverage — thin

Checked: every component named in either file against both component sections.

| Component | DESIGN visual | EXPERIENCE behavioral |
|---|---|---|
| Header, Tabs | yes | IA prose only |
| Buttons (4 variants) | yes | — (no rule for which is primary per surface) |
| Status pills | yes (variant list) | — |
| Progress bar | yes | inside Fremdrift / Event card |
| Inputs / select | yes | — |
| Cards / framed / action | yes | as Event card, «Trenger deg nå» card, Fremdrift card |
| Helper card + avatar | yes | yes |
| Edit box | yes | yes ("variant A") |
| Empty state | yes | yes |
| Greeting | typography only | yes |
| Meldinger card | — | yes |
| Event details | — | yes |
| Task list «Alle oppgaver» rows and group headings | — | yes |
| Helper task card | — | yes |
| «Venter på svaret ditt» banner | — | yes |
| Flash | — | — (used by 5 state rows) |
| Footer «Lenken er bare til deg…» | — | — (Voice only) |

### Findings
- **high** The helper task card, the core UJ-2 component, has no visual spec. «Navy frame», the «Svar ønskes» label, the styling of the large «Ja, jeg tar den» / «Nei» buttons (primary or secondary? side by side or stacked?), the accepted-state look and the collapsed done group are defined only in `helper-page-1.html`, which the spine overrides. The banner has the same gap (DESIGN.md → Components; EXPERIENCE.md → Component Patterns rows "Helper task card" and "banner"). *Fix:* add "Helper task card" and "Answer banner" entries to DESIGN.md Components, with tokens.
- **high** The Meldinger behaviour contradicts itself, and the "seen" rule is undefined. The IA says «Vis alle svar» goes to `/events/:id?panel=messages`, the route that marks replies seen (AD-15, `paths.ts` `eventMessages`). Component Patterns says it "expands to the full list", which reads as a disclosure. Interaction Primitives does not list it among the disclosures. Nothing says whether the newest one or two replies shown in the side column count as seen. The FR-20 "New replies" count and its tests depend on this, and Plan impact does not mention it (EXPERIENCE.md → IA row "Meldinger", Component Patterns row "Meldinger card"). *Fix:* commit to one model, e.g. "«Vis alle svar» is a link to `?panel=messages`; only that view marks replies seen; the side-column preview does not", and add it to Plan impact.
- **medium** The flash message has no component row in either spine, although «Saved», «AI draft failed», «Helper answered» and Flow 1 step 4 depend on it. The success and error variants are unspecified; in code, helper-page errors use `role="alert"` (helper.ejs:13) (both files → Components / Component Patterns). *Fix:* add a Flash row with success and error variants: placement, colour, role and focus behaviour.
- **medium** Status → pill mapping is incomplete. There are six Task statuses plus the derived Urgent and Needs a helper, but DESIGN maps only "Urgent / Needs a helper / On track / Done / Waiting for an answer". It never says what `pill-in-progress` means, or which pill Declined, Can't be done, Unassigned or a non-urgent Accepted task gets. The task-list groups (Trenger hjelper, Venter på svar, I gang, Ferdig) are not tied to statuses either (DESIGN.md → Colors, Components "Status pills"; EXPERIENCE.md → Task list). *Fix:* one table: Glossary status → Norwegian label → list group → pill token.
- **medium** Several DESIGN-only components have no behaviour, and several EXPERIENCE-only components have no visuals (see table). The ones that matter: tab row behaviour with many events at 360 px (wrap or scroll?), Meldinger card and Event details visuals, and task-row anatomy at 360 px ("drop the helper column" is in Responsive, not in Components) (both files). *Fix:* add short rows for each; tabs need an overflow rule.

## 4. State coverage — adequate

Checked, surface by surface. Innlogging: none beyond generic validation. Registrering: generic. Oversikt: no events. Nytt arrangement: AI failed. Arrangement: nothing needs Kari, no tasks, no helpers, five helpers, no replies, saved, validation. Hjelperside: answered, all done, too-long message (Flow 2). Påminnelsesside: all done. Ugyldig lenke: yes. Testinnboks: empty.

### Findings
- **medium** Nytt arrangement has no pending or slow state. A no-JS form POST may block for up to 30 s while the AI drafts (NFR-6), with no guidance and a real risk of double submits (CLAUDE.md requires that repeated actions do not break the app). The mock-AI notice ("says so", FR-23) and the test-mode notice (UJ-4 step 5) have no state row (EXPERIENCE.md → State Patterns). *Fix:* add «Lager utkast…» guidance on the button or page and a duplicate-submit rule, plus a "Mock AI used" flash state.
- **medium** The helper page lacks the stale-action state. FR-12 refuses a change sent from a stale page (e.g. after a reassignment), but no state says what Ola sees. The current marker «Endret etter at du svarte» (helper.ejs:29) is dropped without mention (EXPERIENCE.md → State Patterns, Hjelperside). *Fix:* add "Answer refused (task changed or moved)" with copy, and keep or explicitly drop the "changed after you answered" marker.
- **medium** The not-found and server-error surfaces are missing from both the IA and the State Patterns. `404.ejs` («Siden finnes ikke») and `error.ejs` («Noe gikk galt») exist, and FR-2 refuses access to another organizer's event (EXPERIENCE.md → IA). *Fix:* add both as IA rows with a state treatment (empty-state style, link to Oversikt).
- **low** Innlogging: the wrong-password message (FR-1: must not reveal whether the email exists), the redirect when logged out and Registrering's duplicate email are not specified. *Fix:* one state row each.
- **low** Oversikt edge cases: an event whose date has passed (FR-21 leaves it out of Urgent and Needs a helper; what does «om N dager» say?), an event on today's date, and an event with 0 tasks («0 av 0 ferdig»). *Fix:* add rows.
- **low** Påminnelsesside's «Se alle oppgavene dine» link (helper.ejs:49) and the non-empty Testinnboks layout are not described. *Fix:* mention them in IA "Purpose" or Component Patterns.

## 5. Visual reference coverage — thin

Files: `.working/` directions-1, color-themes-1, progress-colors-1, typography-1, event-view-1, helper-page-1, ornaments-1; `imports/` Interiør 1–6 (.jpg) plus Interiør 4.png. Linked: event-view-1, helper-page-1 and color-themes-1 (palette 1), all from EXPERIENCE.md IA. "Spine wins" is stated once (EXPERIENCE.md line 42).

### Findings
- **high** Broken cross-reference: "The spine wins on conflict, including over the mock details listed under Open items" (EXPERIENCE.md line 42), but there is no Open items section. The linked mocks contain known superseded details: event-view-1 shows the rejected variant B («Lagre alle»), a separate «Neste uke» next-7-days card (since merged into Fremdrift as Mon–Sun weeks) and brass day labels (memlog: changed to muted). Both event-view-1 and helper-page-1 load Google Fonts, which contradicts DESIGN's self-hosting rule. A consumer building from the mocks will copy these. *Fix:* add the "Open items" (or "Mock deviations") section listing each, or rewrite the sentence.
- **medium** DESIGN.md links no visual reference. color-themes-1 (palette 1 Porselen), progress-colors-1 (#8C7353 choice), typography-1 (pair 1 + Dancing Script), ornaments-1 (only option 3 kept) and directions-1 (C+D blend, named in Brand & Style but not linked) are orphans from the visual spine (DESIGN.md → Brand & Style, Colors, Typography, Do's and Don'ts). *Fix:* add one "→ reference" line per section, naming the option that was kept.
- **low** `imports/` is referenced only generically (Interiør 1 is named once). It is git-ignored, so downstream consumers will not have it, and Interiør 4.png is a blank file. *Fix:* state that the images are mood-only and not needed for building; delete the blank PNG.
- **low** All references point into `.working/`, a staging folder. *Fix:* update paths when mocks are promoted to `mockups/`.

## 6. Bloat & overspecification — strong

Both files are tight. Tables are used where they fit, there is no restated persona or scope text, and the narrative in DESIGN Brand & Style is tied to decisions. Plan impact is the right amount.

### Findings
- **low** Do's and Don'ts repeats rules already stated in Colors and Typography (brass never text, no blue progress, handwriting not functional). This is acceptable as a checklist, but it creates two places to update. *Fix:* none needed; keep them in sync.

## 7. Inheritance discipline — adequate

Checked: all four `sources` paths resolve. FR numbers cited (FR-3, 5, 6, 20, 21, 29; NFR-1, 7, 9; AD-16) exist. EXPERIENCE's token reference resolves.

### Findings
- **medium** Requirement restated wrongly. The «Trenger deg nå» row defines Needs a helper as "declined, Can't be done, unassigned, or unanswered for 7+ days". It omits "Open and due within 3 days or past its deadline" (PRD Glossary, FR-21) (EXPERIENCE.md line 72). *Fix:* reference the term ("tasks in Needs a helper (Glossary, FR-21)") instead of paraphrasing it.
- **medium** Glossary drift. The spines use "Waiting for an answer", "In progress", "Haster" and "I gang" where the PRD glossary has Open, Accepted, Urgent and so on, with no mapping; the surface names "Arrangement" and "Oversikt" stand for the glossary terms "Event view" and "Overview" (both files). *Fix:* the status mapping table from §3 resolves this. Add "(Event view)" and "(Overview)" to the IA rows.
- **medium** Cross-spine contradiction on handwriting. DESIGN says Dancing Script is used "in exactly two places" (the time-of-day greeting and empty-state headlines). EXPERIENCE also uses it for the helper-page greeting «Så fint at du er med! – Kari» (Flow 2 step 1) and the reminder-page thank-you (Flow 3 step 2), and DESIGN's own `greeting-mobile` token implies the same (DESIGN.md → Typography; EXPERIENCE.md → Flows 2–3). *Fix:* list the helper and reminder greetings as allowed uses in DESIGN.
- **medium** Plan impact is incomplete. Missing: the loss of FR-16 «Marker som ferdig» (§1); the Meldinger seen semantics against AD-15 and FR-20 (§3); whether the helper task sentence «Kari vil at du skal … innen …» (PRD UJ-2 step 2, helper.ejs:27) stays; the tab label «+ Nytt» changing to «+ Nytt arrangement»; the `?endre=` query, which appears in Plan impact but not in the IA route column (EXPERIENCE.md → Plan impact). *Fix:* add each as a bullet.
- **low** The memlog says the sources were "all five" (brief and PRD addenda, the epics' UX sketches, the current code), but frontmatter lists four, and DESIGN.md omits `epics.md`. *Fix:* add the addenda and `src/views` to `sources`, or note why not.

## 8. Shape fit — strong

DESIGN.md has all eight canonical sections in order. EXPERIENCE.md has all required sections, plus Responsive & Platform (triggered by organizer desktop vs helper 360 px) and Inspiration & Anti-patterns (triggered by imports and rejected directions). The invented "Plan impact" section earns its place: it is the only bridge from the redesign back to the PRD, epics and tests.

### Findings
- **low** The "Open items" section is referenced but absent (see §5). EXPERIENCE.md frontmatter has `title` but no `description`. *Fix:* add the section; add a one-line description.

## Mechanical notes

- **Broken cross-reference:** "Open items" (EXPERIENCE.md line 42) has no target.
- **Name inconsistencies:** "Edit box" (DESIGN) vs "Edit box (variant A)" (EXPERIENCE); "Event card (framed)" vs `card-framed` / "Cards"; «Trenger deg nå» card ↔ `card-action` (linked only in DESIGN prose); "Waiting for an answer" / "In progress" vs the glossary Open / Accepted; tab «+ Nytt arrangement» (spines) vs «+ Nytt» (code `event-tabs.ejs`, an unlisted change).
- **IA vs routes:** every IA route matches `paths.ts`. Missing from the IA: `/logg-ut` (POST, header), 404/error, and the edit-box query (`?endre=<taskId>`, Plan impact only). Helper-page notices use the query parameters `?lagret=1`, `?feil=1` and `?feil=lang` (`paths.helperNotice`), not a session flash. Interaction Primitives ("redirect back … with a flash") should allow for this.
- **Token syntax:** composite strings inside component tokens (see §2) do not follow the `{path.to.token}`-as-value convention in `design-md-spec.md`.
- **Frontmatter:** DESIGN has name, description, status, created/updated and sources. EXPERIENCE lacks a description. Both are `status: draft`.
- **No Mermaid** in either file.
- **Assets:** `imports/Interiør 4.png` is a blank 1.5 kB file (memlog line 27).

## Review Triage Log

Review 1 (2026-11-10), one lens: rubric walker. The five high findings were fixed first. The user then approved this sorting of the medium and low findings: fix now (quick and important), defer with a reason, or reject with a reason. H = high, M = medium, L = low.

| # | Sev. | Finding | Route |
|---|---|---|---|
| 1 | H | No Key Flow for UJ-4 (John, the examiner) | **fixed** in `59807ac`: Flow 5. |
| 2 | H | FR-16 lost: «Marker som ferdig» only on Urgent rows | **fixed** in `59807ac`: on every task that is not Done, through the edit box and all «Trenger deg nå» rows (user decision, see `docs/ki-logg.md`). |
| 3 | H | Helper task card and answer banner have no visual spec | **fixed** in `59807ac`: DESIGN.md → Components. The navy frame was kept, because navy is the main colour of «Porselen» (11:1 on ivory). |
| 4 | H | Meldinger contradicts itself on «seen» (AD-15, FR-20) | **fixed** in `59807ac`: the preview does not mark seen; only `?panel=messages` does. |
| 5 | H | Broken «Open items» reference; mocks show superseded details | **fixed** in `59807ac`: Mock deviations section. |
| 6 | M | Flows not tied to UJ IDs; UJ-1 steps 4–6 in fragments | **fixed** in `37bd6b3`: UJ tags on every flow; Flow 4 adds helpers, edits and deletes a task, and copies links. |
| 7 | M | Failure paths missing in Flows 2–4 | **fixed** in `37bd6b3`: decline branch, Can't be done branch, stale-page refusals, form error and slow AI. |
| 8 | L | Flow 4 has no time and device | **fixed** in `37bd6b3`. |
| 9 | M | Typography tokens not mapped to roles | **fixed** in `37bd6b3`: role table in DESIGN.md → Typography. |
| 10 | M | Component tokens not atomic; no tokens for flash and focus ring | **deferred** to the design story (`deferred-work.md`): only matters when the tokens become CSS variables. |
| 11 | L | `porcelain` unused, `text` unreferenced, `rounded.md` names no component | **fixed** in `37bd6b3`: `porcelain` removed, `text` and `rounded.md` given uses. |
| 12 | L | Load-bearing contrast pairs not stated | **fixed** in `37bd6b3`: all recomputed and listed; field border on soft (3.1:1) called out. |
| 13 | M | No flash component | **fixed**: visual in `59807ac`, behaviour row in `37bd6b3`. |
| 14 | M | Status → pill mapping incomplete | **fixed** in `37bd6b3`: Status vocabulary in EXPERIENCE.md and a pill table in DESIGN.md. |
| 15 | M | Components with behaviour but no visuals, or the reverse (tabs at 360 px, task row on a phone) | **deferred** to the design story (`deferred-work.md`): easier to settle against the real layout. The rest of the gaps were covered by #3, #13, #14 and the plain-page row. |
| 16 | M | Nytt arrangement has no waiting state or double-submit guard | **fixed** in `37bd6b3`: Drafting state, and the server guard listed in Plan impact. |
| 17 | M | No state for an answer refused from a stale page (FR-12); «Endret etter at du svarte» dropped | **fixed** in `37bd6b3`: Answer refused state; the marker is kept. |
| 18 | M | 404 and error pages missing | **fixed** in `37bd6b3`: IA rows and states. |
| 19 | L | Innlogging and Registrering states not specified | **rejected**: the redesign does not change them; FR-1 specifies them and they are tested. |
| 20 | L | Oversikt edge cases (past event, today, no tasks) | **deferred** to the design story (`deferred-work.md`): the text depends on `summaries.ts` and should be decided and tested there. |
| 21 | L | «Se alle oppgavene dine» and the non-empty test inbox not described | **rejected**: unchanged since Story 3.1 and described in its spec. |
| 22 | M | DESIGN.md links no visual reference | **fixed** in `37bd6b3`: one reference line in Brand & Style. |
| 23 | L | `imports/` referenced generically; blank `Interiør 4.png` | **fixed** in `37bd6b3`: marked as mood-only and the blank file named. The file itself is left in the git-ignored folder. |
| 24 | L | References point into `.working/` | **fixed** in `37bd6b3`: the three key mocks moved to `mockups/` and the paths updated. |
| 25 | L | Do's and Don'ts repeats rules from Colors and Typography | **rejected**: the reviewer itself says no fix is needed; the table is a checklist. |
| 26 | M | «Trenger deg nå» restates Needs a helper wrongly | **fixed** in `37bd6b3`: refers to the Glossary and FR-21 instead. |
| 27 | M | Glossary drift (status words, surface names) | **fixed** in `37bd6b3`: Status vocabulary and glossary names in the IA. |
| 28 | M | Handwriting «in exactly two places» contradicts the helper greetings | **fixed** in `59807ac`. |
| 29 | M | Plan impact incomplete | **fixed**: FR-16 and Meldinger in `59807ac`; task sentence, tab label, `?endre=`, double submit and the extra script in `37bd6b3`. |
| 30 | L | Sources in frontmatter incomplete | **fixed** in `37bd6b3`. |
| 31 | L | «Open items» absent; no `description` in EXPERIENCE.md | **fixed**: section in `59807ac`, description in `37bd6b3`. |
