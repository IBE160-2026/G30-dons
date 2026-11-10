# Editorial Review — MasterPlan UX spines

Run 2026-11-10 as the `doc_standards` step of `bmad-ux` Finalize: `bmad-review` with the lenses **structure** and **prose** (prose ran after structure), on `DESIGN.md` and `EXPERIENCE.md`. Style guide: Microsoft Writing Style Guide. Norwegian UI strings in «» and token values were not changed.

## Structure (16 recommendations: 10 to act on, 3 questions, 3 to preserve)

Applied:
- Build rules that only lived in Plan impact or a flow moved into the body: «Frist ‹dato›» into Component Patterns → Helper task card, and the reminder page title into the IA.
- The two unsettled decisions (double submit, edit-box routes) are now a separate **Open decisions for Story 5.1** list at the top of Plan impact.
- Plan impact bullets that repeated the body were condensed into pointers.
- The visual rejection list in Inspiration & Anti-patterns now points to `DESIGN.md` → Do's and Don'ts.
- The IA "Composition references" paragraph was merged into Mock deviations.
- DESIGN Components is grouped as shared, organizer pages and helper pages; the Helper task card is split into sub-bullets.
- The contrast paragraph is now a table, with the edit-box warning after it.
- Prose-only sizes became tokens: `typography.display-mobile` (25 px), `typography.task-title` (17 px), `spacing.card-gap` (18 px), `spacing.plain-max` (420 px) and `spacing.breakpoint` (860 px).
- Repeated a11y rules were trimmed: the role sentence was cut from the Flash row, and "Light mode only" is said once, in DESIGN Colors.
- "Copy link is the only scripted interaction" was corrected to name both scripts.
- Both files now say which spine owns what: DESIGN owns the look, EXPERIENCE the behavior and copy, and each wins in its own area.

Preserved as recommended: the position of Status vocabulary, the Key Flows scaffold, and the "Microcopy." / "Behavioral." openers.

## Prose (27 recommendations and 6 optional)

Applied: "Ink" now names only `colors.text`; the greeting hours have no shared boundaries (05:00–09:59, 10:00–16:59, 17:00–04:59); "Helper card" is renamed "Helpers card and helper rows" where it means the side-column container; the 360 px row says task rows drop the helper column on organizer pages; the no-JavaScript link fallback is referenced from DESIGN; "focus stays near the changed row" became a scroll anchor after the redirect; Norwegian strings in DESIGN and the bare group labels are marked with «»; US spelling (color, centered, behavior, humor, cozy); "email" and "for example" instead of "e-mail" and "e.g."; Kari is introduced in DESIGN; the scale and the contrast sentences are made precise; the subjectless fragments got subjects; "the user" became "the product owner" where it meant the person deciding; the Flow 1 and 2 wording; the Do's and Don'ts fixes; the Mock deviations wording; and all six optional smoothings.

Not applied:
- **Sentence-case headings without "&":** the section headings are the names in the BMAD DESIGN.md and EXPERIENCE.md templates, which tooling and the rubric check against. The three headings outside the templates already use sentence case.
- **A pill column in Status vocabulary:** DESIGN Components already maps the pills to statuses; a second copy would be a second place to update.
