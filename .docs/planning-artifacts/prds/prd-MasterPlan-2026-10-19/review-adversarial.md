---
title: "Adversarial review: PRD MasterPlan"
reviewed: prd.md (updated 2026-10-24), addendum.md, .memlog.md
date: 2026-10-24
---

# Adversarial review: PRD MasterPlan

**Verdict:** The PRD is focused and mostly testable, but it is not ready for stories. The status model has a hole for unassigned tasks. Several transitions (undo, reassign, edit, delete, late acceptance) are undefined. The organizer's name is never captured. Test-mode access and the friends-test infrastructure are unspecified. A developer would have to guess on all of these.

**Counts:** critical 1 · high 10 · medium 12 · low 8

Memlog decisions (fixed-text reminders, no reminder for unanswered tasks, one reminder per yes, no bundling, separate reminder link, Later dropped, organizer-only assignment) are taken as deliberate. They are challenged only where they cause a defect.

---

## Critical

### C1. Unassigned tasks have no status and make an event look On track
- **Location:** Glossary (Task, Task status, Needs a helper, On track); FR-5, FR-7, FR-9, FR-19, FR-21; Vision; UJ-3 outcome.
- **Problem:** Plan-draft tasks and tasks added by hand start with no helper ("at most one assigned helper"). Task status is "exactly one of" five values, and the first, Open, is defined as "assigned, not yet answered". So an unassigned task has no valid status. It is not Urgent and not Needs a helper, so an event whose 30 tasks are all unassigned shows as **On track**. That contradicts the core promise ("every task has someone responsible") and the UJ-3 outcome ("every open task has a helper or is done"). FR-16 also lets the organizer mark "any task" Done, including unassigned ones, and nothing says who it belongs to after that. Every status story and the seed fixture table depend on this.
- **Fix:** Add a status **Unassigned** (no helper) to the Glossary and say that a new or drafted task starts Unassigned. Add Unassigned to "Needs a helper". Define FR-9 as Unassigned → Open. Add a consequence to FR-19: "an event with any Unassigned task is not On track". Include Unassigned in the seed fixture table.

---

## High

### H1. The organizer's name is required but never captured
- **Location:** FR-1; UJ-2 step 1–2 ("Kari has invited you…", "Kari wants you to…"); FR-18 ("on behalf of [organizer name]"); addendum helper page.
- **Problem:** FR-1 only collects an email and a password. The helper page header, task cards, reminder text and sender name all need a display name. Open Question 3 asks about helper names, not the organizer's name.
- **Fix:** In FR-1, require a display name at sign-up and say where it can be edited. Add a consequence: "the helper page and reminder show the organizer's display name". Decide Open Question 3 now; the simplest answer is optional helper names that fall back to the email.

### H2. Terminal states cannot be undone, and an organizer mistake is permanent
- **Location:** FR-11, FR-14, FR-15, FR-16; Open Question 4.
- **Problem:** Once a task is Done (helper or organizer) or Can't be done, no FR allows any change. An organizer who marks Done by mistake cannot reopen the task. A helper who taps Can't be done by mistake cannot take it back. FR-11 says reassign is to "another helper", so the organizer cannot even give the task back to the same helper. FR-11 also does not say whether a Done task can be reassigned. Open Question 4 leaves this to whoever writes the story.
- **Fix:** Add an explicit state-transition table to FR-21 (from-state × actor → to-state). Minimal rules: the organizer can reopen any task (Done or Can't be done → Open for its current helper, which restarts the 7-day clock); a helper cannot leave Done or Can't be done; reassign is allowed from any state except Done, including to the same helper. Close Open Question 4.

### H3. Helpers cannot be removed or corrected, and a mistyped email receives the link
- **Location:** FR-8, FR-10; Open Question 5; NFR-3.
- **Problem:** The five-helper cap is enforced, but there is no way to remove a helper or fix their email. One typo uses up a slot for good. If the organizer presses "send" first, a stranger gets a link to the tasks, event names and organizer name. Open Question 5 (delete event, remove helper) is unresolved, so the developer has to guess about cascades.
- **Fix:** Add FR "Remove a helper from an event": allowed at any time, the helper's tasks in that event become Unassigned (see C1), and the helper link stops showing that event. If the helper has no events left with this organizer, the link shows no data. Decide whether events can be deleted; if yes, delete their tasks, messages and pending reminders. Close Open Question 5.

### H4. Write access through helper links is not specified
- **Location:** FR-12 (covers viewing only), FR-13–FR-15, FR-11; NFR-2.
- **Problem:** FR-12 limits what a link *shows*, not what it can *change*. Nothing requires the server to check that the task in a helper's request is assigned to that token's helper, or that the transition is legal. Without that, a crafted request with a valid token and someone else's task ID can change another helper's or another organizer's task. A crafted request could also mark an Open task Done. Stale pages are a related gap: if Ola has his page open while Kari reassigns a task, his later "Yes" must be rejected, and nothing says so.
- **Fix:** Add consequences to FR-12 or a new FR: "every helper action is accepted only if the task is currently assigned to the token's helper and the transition is allowed by the transition table; otherwise it is refused and changes nothing". Add "an answer sent from a stale page for a reassigned or deleted task is refused with a friendly message". All of these can be tested.

### H5. Date and time semantics are undefined, so status counts and tests will be flaky
- **Location:** Glossary (Urgent, Needs a helper); FR-17, FR-21, FR-25; UJ-4 step 2.
- **Problem:** Deadlines might be dates or datetimes. "Within 3 days", "past its deadline", "14 days after the yes" and "assigned 7 or more days ago" each need an exact rule, and so does whether a task due today is overdue, and in which time zone. The seed fixture counts and the FR-19/FR-20 tests depend on these boundaries. Tests run near midnight, or seed data viewed on a later day, will give different counts. "The statuses always hold" (UJ-4) holds only on the seed day, because statuses are recalculated on every load.
- **Fix:** Add a Glossary entry "Deadline: a calendar date with no time, in the app's configured time zone". Define "due within 3 days" as deadline − today ≤ 3 calendar days, and "past its deadline" as deadline < today. Count reminder and 7-day ages in calendar days from the date of the yes or the assignment. Require an injectable clock so tests can fix "today". Rephrase UJ-4 to say the statuses hold if the seed is run on the same day.

### H6. Reminder behaviour for late acceptance and edited deadlines is ambiguous
- **Location:** FR-17, FR-14, FR-7.
- **Problem:** (a) If a helper accepts a task 2 days before its deadline, or after it, then "3 days before the deadline" is already past. The catch-up rule ("sends every reminder that is due") would send a reminder straight after the yes, which is pointless and could feel like nagging (NFR-7). (b) If the organizer moves the deadline after a yes, nothing says whether the reminder date is recalculated, or what happens when the reminder has already gone out. (c) The organizer can reopen or reassign (H2), and nothing says whether a pending reminder is cancelled. A developer has to choose between "stored scheduled reminder" and "computed on each check", which behave differently in all three cases.
- **Fix:** State that the reminder is derived at check time and not stored ahead. The rule: send once per yes when today ≥ min(yes + 14, deadline − 3), the task is still Accepted, and the yes was given more than 3 days before the deadline. Otherwise send no reminder. Deadline edits take effect at the next check; a reminder already sent for this yes is not sent again. Add a test consequence for each case.

### H7. The event date cannot be edited, and a past event date breaks plan validation
- **Location:** FR-3, FR-5, FR-6, FR-7.
- **Problem:** No FR lets the organizer edit the event's date, location, guest count or information, and UJ-3's information box suggests these change. FR-3 does not stop an event date in the past. In that case FR-5 moves every deadline to today, which is after the event date. FR-6 then calls the plan invalid, the template plan is clamped the same way, and the fallback is invalid too. Nothing says what happens next. FR-7 also does not say whether an edited deadline may fall after the event date, or what happens to existing deadlines when the event date moves earlier.
- **Fix:** In FR-3, require event date ≥ today. Add FR "Edit event fields" (date, location, guests, info). When the date moves earlier, existing deadlines after the new date are capped to the event date, or are flagged; pick one. In FR-7, state that an edited deadline must be on or before the event date.

### H8. Test mode switching and access control are unsafe and undefined
- **Location:** FR-23, FR-24, FR-26; NFR-2.
- **Problem:** (a) A missing AI key switches on *all* of test mode: mock email, the test inbox and the helper-impersonation controls. A deployment that has real email but no AI key, or that has lost its AI key, silently stops sending email and exposes test tools. (b) Nothing says whether the test inbox and the test controls require the organizer login, or whose data they show. The test inbox contains every helper link token, and "Seeded helper links" lists tokens, so an unauthenticated test inbox gives away every helper page. (c) FR-24 says only that the test inbox cannot be reached when test mode is off; it does not say how that is tested.
- **Fix:** Use one explicit `TEST_MODE` setting. With no AI key and test mode off, use the template fallback with a notice; do not switch test mode on implicitly. Alternatively, keep "no key → test mode" but say it only applies when `NODE_ENV` is not production. Require login for the test inbox and the controls, and show only the logged-in organizer's emails and helpers. Add a consequence: "with test mode off, the test-inbox route returns 404".

### H9. The friends test requires hosting, a running scheduler and real email, and none of these is specified
- **Location:** Section 9 SM-1–SM-5, Course line; Open Questions 1–2; NFR-4, NFR-5; FR-17.
- **Problem:** The product metrics and 30% of the grade (the reflection report) depend on 2–3 friends opening links on their phones over days or weeks and getting reminders. A `localhost` link does not open on a friend's phone. A daily reminder check does not run when the laptop is asleep. Free email (for example a Gmail app password, or a provider that needs a verified domain) must actually deliver with the "on behalf of" name and reply-to. Hosting is still an Open Question, but these requirements depend on its answer. Nothing sets the public base URL that links are built from.
- **Fix:** Decide Open Question 2 now: either free hosting with an external free cron or ping (for example a free tier that sleeps, plus a scheduled HTTP trigger), or a local tunnel for the test period. Add a setting `APP_BASE_URL` used in all links (FR-10, FR-18). Add a "production email" setting with one named free provider. If hosting is out of scope, rewrite SM-1–SM-5 as a supervised session with time-travel using the test-mode controls.

### H10. The scope is large for the time actually left
- **Location:** Section 0 (due November 2026), Section 8, FR-1–FR-28; Open Question 7.
- **Problem:** Today is 24 October and the deadline is in November. Architecture, UX, epics and implementation have not started, so a few weeks remain, not two months. v1 contains authentication, two templates, an AI integration with validation and fallback, email in two modes, a scheduler with catch-up, two kinds of token links, a computed status engine, five test-mode controls, a test inbox, a deterministic seed with a fixture table, an automated test for every FR and a traceability table. The order in Section 8 puts reminders last, but the friends test (H9) needs them running early.
- **Fix:** Mark each FR Must or Should, and add a cut list. Candidates to cut: the separate reminder link (reuse the helper link, see M7), "View as helper" (seeded links already cover it), the Messages panel and New-reply tracking (show messages inline), and the Timeline summary. Move reminders before the overview so the friends test can start sooner. Set a date for a feature freeze.

---

## Medium

### M1. The scope of helper identity is unclear
- **Location:** Glossary (Helper, Helper link); FR-2, FR-8.
- **Problem:** "Identified by an email address" suggests one global helper record, but links are "one per helper per organizer". If two organizers add the same email, the developer must choose between one shared record (which risks breaking FR-2 isolation and showing one organizer's name to the other) and one record per organizer.
- **Fix:** In the Glossary, say a helper belongs to one organizer and is unique by (organizer, email). The same email under two organizers gives two helpers with two links. Add an FR-2 consequence.

### M2. "New reply" has no rule for when it counts as seen, and Done reports are left out
- **Location:** Glossary (New reply); FR-13, FR-14, FR-15, FR-20.
- **Problem:** Nothing says what marks a reply as seen: opening the event view, opening the Messages panel, or clicking each reply. FR-13 and FR-14 count answers as New replies, but FR-15 does not say whether Done or Can't be done counts, even though the Glossary's "answer" includes them.
- **Fix:** Define seen as "the organizer has opened the Messages panel of that event, or clicked the reply", and pick one. Add the New-reply consequence to FR-15.

### M3. Reassignment side effects are not specified
- **Location:** FR-11, FR-21, FR-17.
- **Problem:** FR-11 does not say whether the 7-day clock restarts at reassignment, whether the previous helper's messages stay on the task, or whether a pending reminder for the old helper is dropped. FR-21's "from the time the task was assigned" is ambiguous after a reassignment.
- **Fix:** In FR-11, state that reassignment sets the assigned time to now, keeps the message history with the old helper's name, and cancels any pending reminder. Say whether the new helper sees earlier messages (recommended: no).

### M4. Editing a task after it was accepted
- **Location:** FR-7, FR-13.
- **Problem:** The organizer can change the title (the thing the helper agreed to) and the deadline of an Accepted task without the helper knowing, and the status stays Accepted. This is a silent change to a commitment.
- **Fix:** Either reset the task to Open when the title changes, or keep it Accepted and show a "changed" mark on the helper page. Say which in FR-7.

### M5. Deleting a task does not say what else is removed
- **Location:** FR-7.
- **Problem:** Nothing says what happens to the deleted task's messages, its count of New replies, a pending reminder, and helper pages that are already open.
- **Fix:** Add consequences: the task disappears from all helper and reminder links, its messages and New replies are removed, no reminder is sent, and actions from stale pages are refused (H4).

### M6. Template default plans and the mock plan need relative deadlines
- **Location:** Glossary (Template), FR-5, FR-6, FR-23.
- **Problem:** A "fixed mock plan" and a "default plan" with fixed dates would break the rule that deadlines are on or before the event date. The PRD does not say they are offsets from the event date.
- **Fix:** Define default and mock plans as tasks with "days before event" offsets, then clamped by FR-5. Add a consequence: "the mock plan passes FR-6 validation for any event date ≥ today".

### M7. The reminder link's token lifecycle is undefined
- **Location:** Glossary (Reminder link); FR-12, FR-18.
- **Problem:** Nothing says whether there is one reminder token per helper, per reminder, or per organizer, whether it expires, or how it differs from the helper link beyond a filter. Every option needs its own table and tests. A token per reminder means many permanent tokens and nothing that revokes them.
- **Fix:** Keep the deliberate separate view, but make it the helper link with a filter (`/h/<token>?view=accepted`), using no new token. This keeps FR-12 as a single rule and removes a story.

### M8. The definition of an invalid AI plan is incomplete
- **Location:** FR-6.
- **Problem:** The definition does not cover malformed or non-JSON output, an unrealistic number of tasks (for example 200), duplicate titles, or very long titles. The AI output schema is not fixed.
- **Fix:** Add rules for unparseable output → invalid, more than N tasks (for example 60) → invalid, and a maximum title length. Note that the architecture step defines the schema.

### M9. "Every FR has an automated test" includes FRs that are hard to automate
- **Location:** Section 9 Functional; FR-10 (clipboard), FR-26 (opens a new tab), NFR-1 (360 px, easy to tap); FR-27 (no network).
- **Problem:** Testing clipboard behaviour, new tabs and layout needs a real browser (for example Playwright). Its browsers are a large download and add setup risk for the examiner. Otherwise these FRs cannot meet the success criterion.
- **Fix:** Allow "manual check" entries in the traceability table for named UI-only consequences, or test the copy button's link value at the component or HTTP level. Decide on e2e tooling in the architecture step.

### M10. Privacy gaps around the AI provider and link exposure
- **Location:** NFR-3, NFR-4; FR-12; UJ-2.
- **Problem:** Free-tier AI providers may use the data they receive for training. The free-text template fields ("other information", "what needs to be done") will contain names, addresses and dates. Helper links are pasted into chat apps that build previews. The page shows the organizer's name, event names and task titles to anyone holding the link, and links never expire or rotate.
- **Fix:** In NFR-3, require choosing a provider whose free tier does not train on inputs, or showing a notice next to the template fields. Add `noindex` and generic Open Graph tags so chat previews show no data. Add an organizer action "regenerate helper link" that invalidates the old token; it is cheap to build.

### M11. Fixture counts and the seed need deterministic time
- **Location:** FR-20 consequence, FR-25, FR-27.
- **Problem:** Tests that compare against the fixture table run on a separate database. If they seed it with the real clock, counts that depend on the 7-day and 3-day boundaries can flip. The PRD does not say the tests reuse the seed script.
- **Fix:** Add consequences: "tests seed their own database with the same seed logic and a fixed clock", and "the fixture table is generated from, or checked against, the seed definition".

### M12. Nothing happens to events after the event date
- **Location:** FR-19, FR-21.
- **Problem:** After the event, overdue Accepted tasks stay Urgent forever and the overview keeps flagging an event that is over. Nothing defines a past or completed event.
- **Fix:** Define a past event (event date < today): it is shown separately, or with a "past" label and no Urgent or Needs-a-helper counts. One sentence is enough.

---

## Low

### L1. "Live updates" contradicts "updates at once"
- **Location:** FR-22 title vs UJ-2 steps 3 and 6.
- **Problem:** The journeys say Kari's overview updates "at once", but FR-22 means "correct on the next load".
- **Fix:** Rename FR-22 to "Fresh on load" and change the UJ wording to "shows the answer the next time she opens the page".

### L2. NFR-1 "easy to tap" cannot be tested
- **Location:** NFR-1.
- **Problem:** There is no measurable target.
- **Fix:** Use "tap targets at least 44×44 CSS px".

### L3. The reply-to address is never verified
- **Location:** FR-1, FR-18.
- **Problem:** With no email verification, anyone can register with someone else's address. Emails then go "on behalf of" that person, with replies sent to them.
- **Fix:** Accept this as a known limitation in the README, or show the organizer email in the email body. Password reset is also absent; list it as a known limitation.

### L4. Summary denominators are undefined
- **Location:** FR-20 (Done "N of M", Timeline "next deadline").
- **Problem:** Nothing says whether M includes Declined, Can't be done and Unassigned tasks, or whether the next deadline counts Done tasks.
- **Fix:** M = all tasks in the event. The next deadline is the earliest deadline ≥ today among tasks that are not Done.

### L5. Helper page header and empty state
- **Location:** UJ-2 step 1; FR-12.
- **Problem:** Nothing says which events the header lists (events where the helper is added, or events where they have tasks), or what the page shows when the helper has no tasks.
- **Fix:** The header lists events where the helper currently has tasks. With no tasks, the page shows a neutral "no tasks right now" message.

### L6. Scope of the Simulate AI failure toggle
- **Location:** FR-26.
- **Problem:** Nothing says whether the toggle is global or per organizer, or whether it persists across restarts.
- **Fix:** Make it a per-process in-memory flag, off at start, and say so.

### L7. Task title phrasing depends on the AI
- **Location:** UJ-2 step 2; addendum ("Kari wants you to [title] by [date]").
- **Problem:** The card sentence only reads correctly if titles start with a verb ("buy napkins").
- **Fix:** Require imperative, lowercase-safe titles in the AI prompt and the default plans, or use the layout "Kari asks: [title] — by [date]".

### L8. Unthrottled email sending
- **Location:** FR-10.
- **Problem:** Any logged-in account can make the app send emails to any address, which could use up a free email quota.
- **Fix:** Limit sends to a few per helper per hour. One line in FR-10 is enough.
