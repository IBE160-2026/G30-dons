---
title: "Reconciliation: teacher feedback vs PRD"
input: briefs/brief-MasterPlan-2026-09-25/tilbakemelding-product-brief.md (2026-10-06)
compared: prd.md, addendum.md (2026-10-24), with .memlog.md decisions treated as deliberate
created: 2026-10-24
---

# Reconciliation: teacher feedback vs PRD

Status key: **Covered** · **Partly** · **Missing** · **Deliberate deviation** (a logged decision in `.memlog.md` departs from the advice on purpose).

## A. Main changes requested

| # | Teacher point (English paraphrase) | Status | Where in PRD | Suggested fix |
|---|---|---|---|---|
| A1 | Too many "must work" items for a solo project (9, incl. three AI features, email, login for two roles, multiple events, experience bank, calendar export). Pick the core loop plan → follow-up and move the rest to stage 2. | Covered | §8 Scope (v1 = 6 build steps; stage 2 list incl. evaluations, experience bank, helper login, .ics, AI reminders); §5.3 "only AI step in v1"; memlog L9, L33, L49 | None needed. See A1b for story count. |
| A1b | "Make sure the number of stories doesn't grow" (BMAD-flow row). | Partly | 28 FRs, 6 of them test mode; no story budget stated | Add one line to §8: target story budget (e.g. ≤ 15–20 stories, one epic per build step + test mode woven in), so epics/stories stay bounded. |
| A2 | Success criteria measure helper behaviour, not the app. Keep them as evaluation, but add functional criteria that can become tests (e.g. helper opens link without login, says no with a message, organizer sees it). | Covered | §9 Functional (every FR has ≥1 test) + SM-1..5 kept as product evaluation; FR-12, FR-13 consequences match the teacher's example almost verbatim | Optional: in §9, list the brief's 8 functional criteria with the FRs that cover each (brief → FR mapping), since §9 claims coverage but doesn't show it. |
| A3 | Plan to run without own keys: test mode where AI and email are mocked (log or local test inbox) so the examiner can run from README. | Covered | §6 Test Mode FR-23..28; UJ-4; test inbox FR-24 | None. |

## B. Difficulty / feasibility table

| # | Teacher point | Status | Where | Suggested fix |
|---|---|---|---|---|
| B1 | Domain logic: task statuses (confirmed, declined, overdue, due soon), deadlines and reminder times must be right; testable. | Partly | Glossary statuses; FR-17 examples; FR-21 | Rule gap: an **Open** task whose deadline is within 3 days (or past) is neither Urgent nor Needs a helper until 7 days after assignment, which is exactly CM-2. Add a rule: Open task due within 3 days or overdue counts as Needs a helper (or Urgent), plus a test case. Also state what an **overdue Open/Declined** task shows. |
| B2 | Data model: many entities; helpers shared across events add relations. | Covered | Glossary (helper per organizer, ≤5 per event); FR-8 | None (entities reduced: no evaluation/experience bank). |
| B3 | Link access must be secured so one helper can't see others' tasks. | Partly | FR-12 (only own tasks, malformed link reveals nothing, ≥128-bit token); FR-11 (reassigned task disappears) | (a) Say explicitly that the **reminder link** follows the same rules as FR-12 (own token, ≥128 bits, only that helper's Accepted tasks). (b) Links are pasted into chat apps whose preview bots fetch URLs: require that opening a link (GET) never changes state; answers only via explicit button (POST). (c) Optionally: links don't expose organizer data of other helpers (names/emails of co-helpers). |
| B4 | AI: structured output (tasks with deadlines) that can be stored is the hardest part. | Covered | FR-5, FR-6 (invalid-plan definition), NFR-6 | Resolve NFR-6 assumption (30 s timeout) before finalize. |
| B5 | Integrations: LLM API, email, .ics; email needs scheduled sending. | Covered | .ics in stage 2; FR-17; NFR-5 | See C3. |
| B6 | Security & privacy: friends' names/emails, evaluations; anonymization hard. | Partly | NFR-2, NFR-3 (helper emails never sent to AI); anonymization out (stage 2) | Open Question 5 (deleting events/helpers) is also the privacy answer; decide it, and add a one-line retention/deletion statement to NFR-3. |
| B7 | Medium difficulty: finish core flow template/AI plan → link assignment → yes/no → overview before reminders and evaluation. | Covered | §8 build order (reminders last, evaluation stage 2) | None. |

## C. Feasibility with BMAD and Claude Code

| # | Teacher point | Status | Where | Suggested fix |
|---|---|---|---|---|
| C1 | Time and scope: 9 must items in ~2 months is tight; core loop is realistic. | Covered | §8 | None. |
| C2 | Suited for Claude Code: ordinary web app + DB + login + LLM API. | Covered | NFR-5; addendum tech notes (Node 20) | None. |
| C3 | Scheduled email needs a job scheduler that should be kept simple. | Partly | NFR-5 "simplest scheduler"; FR-17 "at least once a day", at most one reminder per task; FR-26 manual trigger | Add a consequence: reminders missed while the app was not running are sent on the next check (catch-up), and re-running the check never sends a duplicate. Both are cheap to test and keep the scheduler a simple periodic check. |
| C4 | Control over AI's work: AI plans hard to test automatically, status logic can be tested. | Covered | FR-6 validity rules; FR-21; mock AI | None. |
| C5 | Testability: status rules, link access, reminder times are testable but not formulated. | Covered | FR-12, FR-17 worked examples, FR-21 | See B1 for the one hole. |
| C6 | Runnable for examiner: needs LLM key and email; make template fallback a documented test mode and add local email. | Covered | FR-23, FR-24, FR-28 README | None. |
| C7 | Dependencies and cost: LLM costs per call; describe cost/mock plan for LLM and email like SMS. | Partly | NFR-4 zero running costs; FR-28 "cost-and-mock plan written in architecture step"; Open Q1 | Deliberate deferral to architecture (memlog L55). Fine, but add Open Q1 as a blocking input to architecture, and state in NFR-4 what happens if no free LLM is found (test-mode mock remains the documented default). |

## D. Brief sections

| # | Teacher point | Status | Where | Suggested fix |
|---|---|---|---|---|
| D1 | Success criteria: add functional criteria that can be test cases. | Covered | §9, FR consequences | See A2 mapping. |
| D2 | Scope: move must items 7–9 to "If there's time". | Covered | §8 stage 2; brief updated (memlog L51–53) | None. |
| D3 | Praised: AI reminders clearly AI-written, never manipulative; fallback; organizer overrides all. | Deliberate deviation | FR-18 fixed respectful text; AI reminders in stage 2 (memlog L33, L49) | None; mention in reflection report why AI reminders were cut. |
| D4 | Teacher's suggested v1 includes "one type of AI reminder by email (with test mode)". | Deliberate deviation | FR-17/18 fixed-text reminders | None; logged decision. |

## E. Portfolio part 1 criteria

| # | Teacher point | Status | Where | Suggested fix |
|---|---|---|---|---|
| E1 | Process & AI steering (30 %): traceable path brief → code; continue PRD/architecture, **commit regularly**; update the brief so history shows how the plan evolved. | Missing (in PRD) | Not mentioned in prd.md. Memlog L48 records "planning trail + commits + reviews document AI use" as an examiner acceptance criterion, but it never reached the PRD. Brief was updated (memlog L51–53). | Add to §9 (or §0): "Planning trail: brief, PRD, architecture, stories and `.memlog.md` are committed as they change; commits are small and reference story/FR IDs; reviews are kept, so AI use is documented." Plus brief → FR mapping (A2). |
| E2 | Functionality & scope (20 %): reduce must list so the core is stable. | Covered | §8 | None. |
| E3 | QA & testing (15 %): status rules and link access as testable requirements; **make some fixed test events with expected overview**. | Partly | FR-25 seed (2 events, every status), FR-19/FR-25 expected overview (Bachelorette on track, Wedding urgent); FR-20 "given a fixed set of test events, each summary shows the expected counts" | FR-20 names no expected counts. Add a small fixture table (in PRD or addendum for architecture): per seeded/test event, tasks by status and the expected Done "N of M", Urgent, Needs a helper, New replies and next deadline. Also clarify whether tests use the same fixtures as seed (FR-27 says separate DB). |
| E4 | Design & UX (10 %): helper page via link must work well on mobile since links are shared in chat apps. | Covered | NFR-1 (360 px, no sideways scroll, easy tap targets); addendum helper page mobile-first; UJ-2 | Optional: name the tap-target size (e.g. ≥ 44 px) so NFR-1 is testable, and note that the page must work in in-app browsers (Messenger). |
| E5 | Code quality & architecture (10 %): justified tech, no more complex than needed; one web app, one DB. | Covered | NFR-5 | None. |
| E6 | README & runnable (10 %): test mode for LLM and email, `.env.example`, test user with ready event. | Covered | FR-23, FR-25 (seeded organizer, login in README), FR-28 (`.env.example` with safe defaults, README sections) | None. |
| E7 | Repo tidiness (5 %): plan where secrets, test data and docs live; API keys and email config never committed. | Partly | FR-28 "never committed"; docs in `.docs/` | Make it checkable: `.env` is in `.gitignore`; only `.env.example` is committed; seed/test fixtures live in a named folder; traceability table and cost-and-mock plan have a stated location in `.docs/`. |

## F. Next steps given by teacher

| # | Teacher point | Status | Where | Suggested fix |
|---|---|---|---|---|
| F1 | Split "must work" into v1 and stage 2 and update the brief. | Covered | §8; memlog L51–53 | None. |
| F2 | Add 5–8 testable functional success criteria (link access, yes/no, overdue tasks, template fallback when AI fails). | Covered | FR-12, FR-13, FR-21, FR-6; §9 | "Overdue" is covered for Accepted only (Urgent); see B1 for Open tasks. |
| F3 | PRD with its own test-mode section: no LLM key, no real email. | Covered | §6 Test Mode | None. |

## Other items noticed during comparison

- NFR-6 still carries `[ASSUMPTION: 30 seconds]`; resolve before finalizing.
- Open Questions 3 (helper names) affects UJ-2's header text and the overview; 4 (undo Done/Can't be done) affects FR-14/FR-15 tests. Decide before stories so test cases aren't rewritten.
- §0 still says "Inline `[ASSUMPTION: …]` tags mark points inferred"; fine, but remove once NFR-6 is resolved.

## Top gaps (summary)

1. Planning trail / regular commits / brief → FR traceability are not in the PRD (only in memlog).
2. Fixed test events lack expected counts (FR-20 is untestable as written).
3. Status-rule hole: an Open task near or past its deadline isn't flagged until day 7 (conflicts with CM-2).
4. Link security not extended to the reminder link, and no "GET never changes state" rule for chat preview bots.
5. Scheduler catch-up/no-duplicate behaviour, story budget, and `.gitignore`/repo layout are implicit, not stated.
