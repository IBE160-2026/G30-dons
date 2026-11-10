# Epic 5 Context: A calm, warm MasterPlan (UX design «Porselen»)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The app works end to end, but it looks cold, impersonal and cluttered, and some parts are hard to take in. This epic builds the UX design «Porselen»: a calm, warm, slightly old-fashioned look for people who do not enjoy planning, an event view where the organizer sees at once what needs her, and a helper page that is quick to answer on a phone. No new features: the same routes, rules and data, shown differently. It is the course's design part, due 12 November 2026 (the application is due 14 November): done means the new CSS is in use across the whole app and locked with a written rule and an automated test.

## Stories

- Story 5.1: Build the Porselen design

## Requirements & Constraints

- **Look:** ivory page, white cards, navy ink, link blue, brass only as ornament, dark beige progress, muted terracotta for Urgent and Needs a helper, sage for On track and Done. Light mode only. Every text pair meets WCAG AA; input borders and progress bars meet 3:1.
- **Type:** Lora for the logo, titles and event names; Source Sans 3 for everything a user reads to act; Dancing Script only for greetings and empty-state headlines. All three self-hosted (OFL), because the examiner's Docker run is offline and helper pages must not call third parties.
- **Ornament:** only the framed card (fine inner rule and a brass ❧) on event and summary cards, the ❦ by the logo, and a thin blue stripe under the header. Ornaments are hidden from screen readers.
- **Navigation stays simple:** header plus one row of tabs; no sidebar, menus or modal dialogs.
- **Organizer first view of an event:** what needs her now (tasks in Needs a helper, then Urgent), then total progress with the deadlines this week and next week (calendar weeks, Monday–Sunday), then helpers and messages; all tasks below as calm read-only rows, one task opened for editing at a time. The organizer can mark any task Done.
- **Helper page:** neutral header («Du er invitert til å hjelpe til med …»), a short handwritten greeting from the organizer, tasks grouped by event, unanswered tasks clearly marked, large answer buttons (at least 48 px).
- **Voice:** informal «du», warm and short; no emoji; no exclamation marks in errors; singular for one.
- **Accessibility:** WCAG 2.2 AA; tab order follows reading order; visible focus; status never by color alone; flashes `role="status"`, errors `role="alert"`; no sideways scrolling at 360 px.
- **Everything works without JavaScript.** Small external scripts may only enhance.
- The redesign changes the FR-20 summaries, the helper header and buttons, and the event view; tests that check old texts must follow.

## Technical Decisions

- Server-rendered Express + EJS; one stylesheet `public/styles.css`; no inline JavaScript, external scripts only (helmet default CSP).
- Every status change still goes through `tasks.apply` (single writer); new reads only, no new writes.
- Derived states (Urgent, Needs a helper, On track) come only from `domain/status.ts`, recomputed against today; dates are Oslo calendar dates through `domain/dates.ts`.
- Replies become seen only by opening the messages list (`GET /events/:id?panel=messages`); nothing else marks them seen.
- Helper pages are reached by token only, never write on GET, and keep their privacy headers.
- Fonts, colors, radii and spacing come only from CSS custom properties that mirror the `DESIGN.md` tokens.

## UX & Interaction Patterns

- The UX design is the source of truth: `.docs/planning-artifacts/ux-designs/ux-MasterPlan-2026-11-10/DESIGN.md` (look) and `EXPERIENCE.md` (behavior, copy, states, flows). Mocks in `mockups/` are references; the spines win, and the known differences are listed under Mock deviations.
- Every action is a form POST followed by a redirect with a flash; disclosures use `<details>`.
- Plain pages (not found, server error, invalid link) are one centered card with a link back.

## Cross-Story Dependencies

- Built before Story 3.3. Story 3.3 adds a way to change an answer on the helper page; it must use the helper card and buttons from this story.
- Stories 4.x add controls to the event view and the test inbox; they reuse the components from this story.
