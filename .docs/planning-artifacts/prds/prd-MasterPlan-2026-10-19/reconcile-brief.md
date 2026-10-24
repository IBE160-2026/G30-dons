---
title: "Input reconciliation: brief vs PRD"
created: 2026-10-24
inputs:
  - briefs/brief-MasterPlan-2026-09-25/brief.md
  - briefs/brief-MasterPlan-2026-09-25/addendum.md
compared_against:
  - prds/prd-MasterPlan-2026-10-19/prd.md
  - prds/prd-MasterPlan-2026-10-19/addendum.md
  - prds/prd-MasterPlan-2026-10-19/.memlog.md (logged decisions treated as deliberate overrides)
---

# Input reconciliation: brief + brief addendum vs PRD

Decisions logged in `.memlog.md` were excluded: fixed-text reminders, no reminders for unanswered tasks (7-day flag), Later dropped, calendar export in stage 2, test inbox page, Urgent merging "due soon" and "overdue", up to five helpers, organizer-only assignment.

## Gaps

### G-1. Ethical constraints have no home in the PRD (high)
- **Source (brief, Success Criteria):** "Key ethical constraints: Privacy: only anonymized, general lessons go into the experience bank, in line with the GDPR. Respect: reminders never manipulate or guilt-trip. ... Control: the organizer can edit or override every AI-drafted plan."
- **Source (brief addendum):** "AI talking to real people on someone's behalf. Reminders go out in the organizer's name to her friends. It must be clear that AI wrote them, and the tone must never become manipulative or guilt-tripping." / "Trust in AI plans. An AI plan can be wrong or leave things out."
- **PRD state:** Control is covered by FR-6/FR-7, and NFR-3 covers data minimization. But "never manipulate or guilt-trip", GDPR, and the "acting on the organizer's behalf toward her friends" concern appear nowhere. These also feed the 30% reflection report.
- **Where it lands:** a short "Ethical constraints" subsection under section 7 (NFRs), or an NFR-7 "Respectful communication". Add a testable consequence to FR-18, for example "the reminder text contains no guilt, urgency pressure or blame wording; reviewed against a checklist". Also add a GDPR line to NFR-3: helper emails are third-party personal data entered by the organizer.

### G-2. Reminder tone is weakened: "direct" and the "good manager" voice are gone (medium)
- **Source (brief, Solution 3):** "Email reminders use a fixed text that is respectful and direct, the way a good manager speaks to a team member."
- **Source (brief addendum, Reminder tone):** "The first idea was humorous reminders. This was changed to personal, respectful and direct reminders, because a joke on an overdue task can read as passive-aggressive."
- **PRD state:** FR-18 says only "a fixed, respectful text". "Direct", the manager analogy and the rejected humor are dropped. The fixed-text decision is logged, but the tone decision is not.
- **Where it lands:** FR-18 description (tone: respectful, direct, no humor), plus a PRD addendum line for UX/copywriting that records the rejected humorous variant and why.

### G-3. No problem statement (medium-high)
- **Source (brief, The Problem):** "The work is handed out in group chats, notes and emails, and nobody follows up. Helpers forget tasks and nobody notices until the last minute. The result is stress, tension between people and chaotic parts of the event." / "The reluctant organizer lacks both knowing what to do and a way to make others follow through."
- **PRD state:** section 1 states the promise and UJ-1 says Kari is "overwhelmed", but the PRD never states the problem it solves, its two parts (knowing what to do, getting follow-through), or the social cost (tension between friends). This is the reason SM-1 exists.
- **Where it lands:** a 2–3 sentence "Problem" paragraph in section 1 (Vision), or a new section between Vision and Users.

### G-4. Differentiation and positioning dropped (medium)
- **Source (brief, What Makes This Different):** "Follow-through is the core feature." / "It's built for people who aren't planners. It gives them a starting plan rather than a blank board." / "It handles several overlapping events that share the same helpers." / "There is no technical moat. The advantage is a clear focus on one user and one problem."
- **PRD state:** the features exist (FR-4, FR-5, FR-8), but the "why us" framing and the honest "no moat, focus is the edge" statement are missing. Without it, nothing in the PRD guards against scope creep toward a generic task tool.
- **Where it lands:** one short paragraph in section 1 (Vision), or a "Product principles" list (see G-5).

### G-5. Persona feel and product character lost: "doesn't want a project-management tool" (medium)
- **Source (brief addendum, Persona detail):** "The maid of honor doesn't want a project-management tool."
- **Source (brief, Who This Serves):** "without the skills, or the wish, to run it, and who fits it around a busy and stressful life. ... She needs to be told what has to happen and when, and she needs to trust that the helpers will actually do their tasks."
- **Source (brief, Vision / addendum):** "a tool they enjoy enough to return to" / "user-friendly enough that private individuals use it often, not once in a lifetime."
- **PRD state:** section 2 describes the organizer only by device and login. Her reluctance, lack of time, need to be told what to do, and need for trust are absent. Nothing says the product must *not* feel like Trello or Asana (no boards, no PM jargon, minimal setup).
- **Where it lands:** enrich the Organizer bullet in section 2, and add a "Product principles / feel" note (for example: guided, not a blank board; no project-management vocabulary; minimal effort for the organizer) in section 1 or 7. Add a pointer to the PRD addendum UX section for bmad-ux.

### G-6. Changing answers: edge cases left undefined (medium)
- **Source (brief, Solution 2):** "Helpers ... answer yes or no to each task, with an optional message. They can change their answer later." / criterion 3: "a helper can change a yes to a no, or the reverse, and the overview updates."
- **PRD state:** FR-14 covers Accepted <-> Declined, and Open Question 4 covers undoing Done or Can't be done. These interactions are not covered:
  - FR-17 "14 days after the helper said yes" and "at most one reminder": if a helper says yes, no, then yes again, does the 14-day clock restart, and can a second reminder fire?
  - Can a helper change from Declined after the 7-day flag, or after the organizer has seen the decline but before she reassigns? (Reassignment removing the task is covered by FR-11.)
  - Does an answer change count as a New reply (FR-13 says yes for first answers; FR-14 does not say)?
  - Can the answer be changed from the reminder link?
- **Where it lands:** add consequences to FR-14 and FR-17, or extend Open Question 4.

### G-7. Course framing and the reflection report missing from Success Metrics (medium)
- **Source (brief, Success Criteria > Course):** "Code and functionality (70%) ... backed by documentation of how AI was used and how quality was ensured (BMad planning trail, reviews, tests)." / "Reflection report (30%): the development process, the influence of AI, and the ethical and technical issues."
- **Source (brief addendum):** "AI-generated code. The app itself is written with AI, so quality assurance (reviews, tests, the planning trail) is part of its credibility."
- **PRD state:** section 9 covers functional tests and product metrics. The 70/30 grading, AI-use documentation and the reflection report are absent. The memlog records an examiner acceptance item ("planning trail + commits + reviews document AI use") that did not make it into the PRD.
- **Where it lands:** a "Course" block in section 9, or a FR-28 consequence ("docs describe how AI was used and how quality was ensured").

### G-8. "Sensible deadlines" is only half-specified (low)
- **Source (brief, Solution 1):** "The AI drafts the tasks with sensible deadlines."
- **PRD state:** FR-5/FR-6 reject deadlines after the event date, but not deadlines in the past (before today). With an event 8 months away this is unlikely. With a near event or a mock plan, though, it could produce tasks that are instantly Urgent.
- **Where it lands:** FR-6 invalid-plan rule, or an Open Question.

### G-9. Persona example data and the growth loop not carried over (low)
- **Source (brief):** "a bachelorette party (15 guests, 6 months away) and the wedding (80 guests, 8 months away) with five helpers." / addendum: "Some helpers may organize an event themselves one day."
- **PRD state:** UJ-1 has no sizes or horizons. These numbers are useful for seed data (FR-25) and for test fixtures. The helper-becomes-organizer loop is absent from the vision.
- **Where it lands:** UJ-1 context line or FR-25. The growth loop goes in a one-line vision note.

### G-10. Long-term vision condensed away (low)
- **Source (brief, Vision):** "the place people go when they have to organize something big" plus the four-step roadmap (richer web platform, more templates, template marketplace, mobile app).
- **PRD state:** section 1 covers only v1. Section 8 lists stage 2 and out-of-scope items, but not the direction.
- **Where it lands:** one sentence at the end of section 1 that points to the brief's Vision.

### G-11. Reminders "in the organizer's name" (low)
- **Source (brief addendum):** "Reminders go out in the organizer's name to her friends."
- **PRD state:** FR-18 names the organizer in the text, but the sender identity (from-name, reply-to) is unspecified. This matters for trust and for the respect constraint.
- **Where it lands:** FR-18 consequence, or the architecture tech note in the PRD addendum.

## Pointers from the brief addendum (no gap, but worth a link)

- **Competitive landscape table** (WhatsApp, Notion/Trello, Todoist, Partiful, Splitwise, Zola and others): add one line in the PRD addendum pointing to `briefs/brief-MasterPlan-2026-09-25/addendum.md#competitive-landscape` for the reflection report and the UX work.
- **Baseline expectations, not differentiators:** joining without installing anything (as with Partiful) is already met by FR-12. Worth noting it is table stakes, not the selling point.
- **Rejected ideas with reasons:** AI chat-to-tasks ("already common, not a differentiator"), two-way chat integration ("too heavy"), SMS ("needs a paid service", consistent with NFR-4), everyday tasks ("Todoist and Google are strongest"), humorous reminders ("can read as passive-aggressive"). A one-line "Rejected ideas: see brief addendum" pointer in PRD section 8 would preserve the reasons.
- **User complaints** ("one organizer ends up doing all the work", "plans stall in the group chat"): these support the problem statement in G-3.
- **Professional planners as a future audience / template marketplace:** already out of scope in the PRD. Pointer only.
