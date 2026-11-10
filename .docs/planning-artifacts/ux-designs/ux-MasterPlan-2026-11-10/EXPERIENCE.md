---
title: MasterPlan · Experience Spine
description: How MasterPlan works for Kari (organizer, desktop) and Ola (helper, phone) in the Porselen redesign — structure, behaviour, states, accessibility and key flows.
status: draft
created: 2026-11-10
updated: 2026-11-10
sources:
  - .docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/brief.md
  - .docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/addendum.md
  - .docs/planning-artifacts/prds/prd-MasterPlan-2026-10-19/prd.md
  - .docs/planning-artifacts/prds/prd-MasterPlan-2026-10-19/addendum.md
  - .docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md
  - .docs/planning-artifacts/epics.md
  - src/views/ (the UI as built before the redesign)
---

# MasterPlan — Experience Spine

## Foundation

Server-rendered web app (Express + EJS, see `ARCHITECTURE-SPINE.md`). No UI framework: plain HTML forms, one stylesheet (`public/styles.css`) and no inline JavaScript (AD-16). Everything in this spine must work without JavaScript; small external scripts (like `public/copy.js`) may only enhance.

Two surfaces with different devices:
- **Organizer pages** (Kari): desktop browser first, usable on a phone.
- **Helper pages** (Ola): phone browser first, from a link shared in a chat app, no login.

`DESIGN.md` is the visual identity reference. All UI text and emails are in Norwegian (NFR-9). Light mode only.

## Information Architecture

| Surface | Route (today) | Reached from | Purpose |
|---|---|---|---|
| Innlogging | `/logg-inn` | Start, logout | Log in as organizer |
| Registrering | `/registrer` | Link on Innlogging | Create an organizer account |
| Oversikt (Overview) | `/` | Logo, tab «Oversikt», after login | Greeting and one framed card per event: status, counts, progress, days left |
| Nytt arrangement | `/events/new` | Tab «+ Nytt arrangement», empty Oversikt | Pick a template, fill in fields, get an AI draft (FR-3, FR-5) |
| Arrangement (Event view) | `/events/:id` | Event tab, event card on Oversikt | Act now, progress, this and next week, helpers, messages, all tasks |
| Arrangement, one task open | `/events/:id?endre=<taskId>` | «Endre» on a task row | The same page with the edit box open under that task |
| Meldinger | `/events/:id?panel=messages` | «Vis alle svar» in the Meldinger card | All replies from helpers, newest first; opening it marks them seen (AD-15) |
| Hjelperside (Helper page) | `/h/:token` | Link shared by the organizer | The helper's tasks, grouped by event, with answers |
| Påminnelsesside (Reminder link) | `/h/:token?view=accepted` | Link in a reminder email | Only the tasks the helper has said yes to |
| Ugyldig lenke | `/h/:token` (invalid) | Old or mistyped link | Explains that the link does not work, without revealing anything |
| Testinnboks | `/test/innboks` | Header link, test mode only | Emails the app would have sent; «Send påminnelser nå» |
| Siden finnes ikke | any unknown route, or another organizer's event (FR-2) | Mistyped or old address | «Siden finnes ikke» and a link to Oversikt |
| Noe gikk galt | any route, on a server error | — | «Noe gikk galt», «Prøv igjen om litt.» and a link to Oversikt |

Navigation stays as simple as it is today, which the user explicitly wants to keep: a header with the logo and the user links, and one row of tabs (Oversikt, one tab per event, «+ Nytt arrangement»). No sidebar, no menus, no modal dialogs.

→ Composition references in `mockups/`: `event-view-1.html` (event view), `helper-page-1.html` (helper page at 360 px), `color-themes-1.html` palette 1 «Porselen» (overview). The spine wins on conflict; the known differences are listed under Mock deviations.

## Voice and Tone

Microcopy. The brand posture is in `DESIGN.md` → Brand & Style.

Informal "du", warm and simple, short sentences. No emoji, no exclamation marks in errors, no humour in reminders (NFR-7).

| Do | Don't |
|---|---|
| «God kveld, Kari» | «Velkommen tilbake, bruker!» |
| «To arrangementer er i gang. Ett trenger deg litt nå.» | «Du har 2 aktive arrangementer med 3 kritiske varsler.» |
| «Trenger deg nå» | «Handling påkrevd» |
| «Du er invitert til å hjelpe til med Bryllup og Utdrikningslag» | «Kari har tildelt deg 5 oppgaver» |
| «Så fint at du er med! – Kari» | «Hei!!! 🎉» |
| «Takk! Kari ser at du tar «Bestemme meny».» | «Svar registrert.» |
| «Lenken er bare til deg. Del den ikke videre.» | «ADVARSEL: Ikke del lenken!» |
| «Ingen nye svar ennå» | «Ingen data» |
| Counted text in singular for one: «1 oppgave venter på svaret ditt» | «1 oppgaver» |

The greeting follows the time of day in Oslo: «God morgen» (05–10), «God dag» (10–17), «God kveld» (17–05).

## Component Patterns

Behavioral. Visual specs are in `DESIGN.md` → Components.

| Component | Use | Behavioral rules |
|---|---|---|
| Greeting | Oversikt | Handwritten, by time of day, with the organizer's name. One plain sentence under it summarizes the state. |
| Event card (framed) | Oversikt | Whole card is one link to the event. Shows name, date, «om N dager», one status pill (On track, or «N haster · N trenger hjelper»), «N av M ferdig» and a progress bar. New replies shown as a small count. |
| «Trenger deg nå» card | Arrangement, top of main column | Lists, in this order: tasks in **Needs a helper** (PRD Glossary, FR-21), then **Urgent** tasks. Delegation rows have an inline helper select with «Gi oppgaven», and a quiet «Marker som ferdig» so Kari can do the task herself. Urgent rows have «Marker som ferdig». A declined row shows the helper's message. Hidden when empty, replaced by one line in the Fremdrift card: «Ingenting trenger deg akkurat nå.» |
| Fremdrift card | Arrangement | Progress bar with «N av M ferdig», one pill per status with its count, then two groups: «Denne uka» (rest of the current Monday–Sunday week) and «Neste uke» (next Monday–Sunday), tasks grouped by day. A group with no tasks says «Ingen frister». |
| Helper card | Arrangement, side column | Initial, name, one-line summary. «Kopier lenke» copies the helper link (via `copy.js`) and shows «Lenken er kopiert» in a `role="status"` line. Without JavaScript the button reveals the link in a read-only field to copy by hand. «+ Legg til hjelper» is a disclosure with e-mail and optional name. |
| Meldinger card | Arrangement, side column | On `/events/:id`: the count of new replies («2 nye») and a preview of the newest one or two. The preview does not mark anything seen, so the count stays until Kari opens the list. «Vis alle svar» is a link to `/events/:id?panel=messages`, which renders the same page with the full list in the card and marks the listed replies seen (AD-15, FR-20). «Skjul svar» links back to `/events/:id`. |
| Task list «Alle oppgaver» | Arrangement, below | Read-only rows grouped by status: Trenger hjelper, Venter på svar, I gang, Ferdig (collapsed by default). Each row: title, short date, status pill with helper name, «Endre». «+ Ny oppgave» opens an empty edit box at the top of the list. |
| Edit box (variant A) | Task list | «Endre» opens an edit box under that one row only; the button becomes «Lukk». Fields: title, deadline, helper. Actions: «Lagre», «Avbryt», «Marker som ferdig» (on every task that is not Done, whatever its status, FR-16) and «Slett oppgaven». Only one edit box is open at a time. On a validation error the page reloads with that box open and the error under the field. |
| Event details | Arrangement, under the title | Date, «om N dager», place and guest count are always visible. The rest (hva, hva må gjøres, annen info) is behind «Vis alle detaljer». «Endre detaljer» appears there when FR-29 (edit event fields, Should) is built. |
| Helper task card | Hjelperside | Unanswered tasks: navy frame, «Svar ønskes» label, two large buttons «Ja, jeg tar den» and «Nei», and «Legg ved en melding (valgfritt)» as a disclosure. Accepted: «Du har sagt ja», buttons «Ferdig» and «Kan ikke gjøres», and «Ombestemt deg? Endre svaret». Done tasks collapsed per event. |
| «Venter på svaret ditt» banner | Hjelperside | Shown while there are unanswered tasks: «N oppgaver venter på svaret ditt». |
| Flash | Every page after a form POST | One message at the top of the content, set by the redirect after the action. Confirmations use `role="status"`; errors use `role="alert"`. It is shown once and is gone on the next page load. Focus is not moved to it. |
| «Endret etter at du svarte» marker | Hjelperside | When Kari changes a task after Ola answered it, the card shows this small marker until Ola answers again (kept from today's helper page). |
| Empty state | Anywhere | Handwritten headline plus one plain sentence and, where it makes sense, one action. |

## Status vocabulary

The PRD glossary terms and the words on screen. Pill styles are in `DESIGN.md` → Components.

| Glossary (PRD) | Organizer pages | Helper page | Group in «Alle oppgaver» |
|---|---|---|---|
| Unassigned | «Ingen hjelper» | — | Trenger hjelper |
| Open | «Venter på svar · ‹helper›» | «Svar ønskes» | Venter på svar, or Trenger hjelper when it is in Needs a helper |
| Accepted | «I gang · ‹helper›», or «Haster · ‹helper›» when Urgent | «Du har sagt ja» | I gang |
| Declined | «Avslått · ‹helper›» | «Du har sagt nei» | Trenger hjelper |
| Done | «Ferdig · ‹helper›» | «Ferdig» | Ferdig |
| Can't be done | «Kan ikke gjøres · ‹helper›» | «Kan ikke gjøres» | Trenger hjelper |
| Urgent (derived) | «Haster» | — | — |
| Needs a helper (derived) | «Trenger hjelper» | — | — |
| On track (event) | «I rute» | — | — |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| No events | Oversikt | Greeting, then empty state: «Her begynner det» and «Lag ditt første arrangement», with the primary button. |
| Nothing needs Kari | Arrangement | «Trenger deg nå» card is hidden; Fremdrift starts with «Ingenting trenger deg akkurat nå.» |
| No tasks | Arrangement | Empty state in the task list: «Ingen oppgaver her ennå» and «Legg til den første oppgaven.» |
| No helpers | Arrangement | Helper card: «Ingen hjelpere ennå.» and the add form open. Delegation selects show «Legg til en hjelper først». |
| Five helpers | Arrangement | «+ Legg til hjelper» hidden; header shows «5 av 5». |
| No replies | Arrangement | Meldinger card: «Ingen nye svar ennå» (handwritten) and «Svar fra hjelperne dukker opp her.» |
| Drafting | Nytt arrangement | The form says next to the button: «Det kan ta opptil et halvt minutt å lage utkastet.» (NFR-6). A small external script, like `copy.js`, disables the button after the first press and changes its text to «Lager utkast …». Without JavaScript the hint still applies, and the server must not create two events from a double submit (see Plan impact). |
| Mock AI | Arrangement, after create | Flash (`role="status"`): the plan is a fixed test plan because no AI key is set (FR-23). |
| AI draft failed | Arrangement, after create | Flash at the top (`role="status"`): the template was used instead (FR-6). Same flash style as other confirmations. |
| Saved | Any form | Flash with what happened, in plain words. Focus stays near the changed row. |
| Validation error | Any form | The form keeps the input; a message in `{colors.error}` under the field, linked with `aria-describedby`; the first invalid field gets focus. |
| Helper answered | Hjelperside | Flash «Takk! Kari ser at du tar «‹oppgave›».» for yes; matching texts for no, Done and Can't be done. |
| Answer refused | Hjelperside | The task changed or moved since the page was loaded (FR-12). Error flash (`role="alert"`): «Oppgaven er endret siden du åpnet siden. Se oppdatert status under.» The page shows the current state; nothing was saved. |
| All done | Hjelperside / Påminnelsesside | Empty state «Alt er gjort!» and «Du har ingen oppgaver som venter på deg nå.» |
| Invalid link | Ugyldig lenke | Calm explanation that the link does not work and to ask the person who sent it. No details. |
| Test inbox empty | Testinnboks | «Ingen e-poster ennå» and the «Send påminnelser nå» button. |
| Not found | Siden finnes ikke | Plain card, «Vi fant ikke det du lette etter.» and «Til oversikten». Also used for another organizer's event, so nothing is revealed (FR-2). |
| Server error | Noe gikk galt | Plain card, «Prøv igjen om litt.» and «Til oversikten». No technical details. |

## Interaction Primitives

- **Forms and links only.** Every action is a link or a form POST, followed by a redirect back to the same place with a flash. No client-side state.
- **Disclosures** use `<details>`/`<summary>` (event details, add helper, message box, done groups), so they work without JavaScript and by keyboard.
- **One edit box at a time** in the task list, opened through a link with the task id (so it survives reload and works without JavaScript).
- **Copy link** is the only scripted interaction, with a no-JavaScript fallback.
- **Banned:** modal dialogs, drag and drop, hover-only actions, permanently open edit forms on every row (the clutter this redesign removes), infinite scroll.

## Accessibility Floor

Behavioral. Colour contrast is in `DESIGN.md` → Colors.

- WCAG 2.2 AA on all surfaces.
- Every field has a visible label (or a visually hidden one in compact rows, as today). Errors are tied to fields with `aria-describedby`.
- Status is never colour alone: every pill and progress bar has text.
- Flash messages use `role="status"`; errors use `role="alert"`.
- Tab order follows reading order; the current tab has `aria-current="page"`. Focus is visible everywhere (2 px navy outline).
- Ornaments (❦, ❧, header stripe) are decorative and hidden from screen readers.
- Handwriting is never the only carrier of meaning: empty states repeat the point in plain text.
- Touch targets on helper pages are at least 48 px high.

## Responsive & Platform

| Width | Behavior |
|---|---|
| ≥ 860 px | Event view in two columns (main + 300 px side). Overview cards two across. |
| < 860 px | Side column stacks under the main column; helpers and messages come after «Trenger deg nå» and Fremdrift. Overview cards one across. |
| 360 px | Helper pages are designed for this width (NFR-1): one column, full-width answer buttons in pairs, no sideways scrolling. Task rows drop the helper column. |

## Inspiration & Anti-patterns

- **Lifted from the inspiration images** (`imports/`, local only and git-ignored; mood references, not needed to build anything; `Interiør 4.png` is blank): ivory walls, blue-and-white porcelain, ticking stripes, brass, warm light; the pinboard with small cards (Interiør 1) is the model for summary cards.
- **Kept from today:** the simple header-and-tabs navigation.
- **Rejected:** a pinboard or recipe-book look (too playful or too dense); sage or linen-brown as the main colour; floral backgrounds, gingham ribbons, divider ornaments and plate-rim borders (only the framed card corner was kept); handwriting anywhere functional; bright red for urgent; blue progress bars; dark mode; emoji.
- **Rejected — "edit the whole list" mode** (variant B): needs a new bulk-save route and brings back the wall of forms.

## Key Flows

### Flow 1 — Kari fixes what is stuck (UJ-3; Tuesday evening, laptop on the sofa)

1. Kari logs in. The greeting reads «God kveld, Kari» and «To arrangementer er i gang. Ett trenger deg litt nå.»
2. The Bryllup card says «2 haster · 1 trenger hjelper», «15 av 23 ferdig». Utdrikningslag says «I rute».
3. She opens Bryllup. «Trenger deg nå» shows «Leie lokale» first: Kim said no, «Jeg er bortreist den helgen».
4. She picks Ola in the select next to it and presses «Gi oppgaven». The flash confirms it, and the row is gone.
5. In the side column she presses «Kopier lenke» on Ola's card and pastes the link into Messenger.
6. **Climax:** back on the page, «Trenger deg nå» has shrunk, the Fremdrift card shows what is due this week and next, and nothing on the wedding is stuck without her knowing. She closes the laptop calm instead of worried.

Failure: she presses «Gi oppgaven» without choosing a helper → the page reloads with «Velg en hjelper» under the select, and focus on it.

### Flow 2 — Ola answers from Messenger (UJ-2 steps 1–4; lunch break, phone)

1. Ola taps the link. The page reads «Du er invitert til å hjelpe til med Bryllup og Utdrikningslag» and, in handwriting, «Så fint at du er med! – Kari».
2. The banner says «3 oppgaver venter på svaret ditt». Under «Bryllup», «Bestemme meny» has a navy frame and «Svar ønskes».
3. He presses «Ja, jeg tar den». For «Kjøpe servietter og sugerør» he opens «Legg ved en melding» and writes that he can buy them on Friday, then answers yes.
4. **Climax:** the flash reads «Takk! Kari ser at du tar «Bestemme meny».», the banner counts down, and the remaining question is obvious. It took him a minute, and he knows exactly what he promised and by when.

Branch: for «Lage spilleliste» he presses «Nei» with the message «Jeg kan ikke den helgen». The card shows «Du har sagt nei», and the task appears in Kari's «Trenger deg nå» with his message.

Failure: the message is too long → the page reloads with the answer not saved and «Meldingen kan ha maks 500 tegn.»

Failure: Kari moved the task to Siri while the page was open → «Oppgaven er endret siden du åpnet siden. Se oppdatert status under.», and the task is gone from his list.

### Flow 3 — Ola reports back from a reminder (UJ-2 steps 5–7; two weeks later, phone)

1. A reminder email arrives with Kari's name and one link.
2. The link opens «Oppgaver du har sagt ja til», with a short handwritten thank-you from Kari, and only the accepted tasks.
3. He presses «Ferdig» on «Bestille kake».
4. **Climax:** the page shows «Alt er gjort!». Kari will see it on her next visit.

Branch: the cake shop is closed, so he presses «Kan ikke gjøres» and writes why. The task goes to Kari's «Trenger deg nå» with his message, and she can give it to someone else or mark it Done herself.

Failure: Kari already marked the task Done → the answer is refused with the «Oppgaven er endret …» message, and the page shows it as Done.

### Flow 4 — Kari starts a new gathering (UJ-1; Sunday afternoon, laptop)

1. From the empty Oversikt (or the tab «+ Nytt arrangement») she picks a template, sets the date and fills in a few fields.
2. She presses «Opprett arrangement». The button changes to «Lager utkast …». The AI makes a draft plan; if it fails, the template plan is used and the flash says so.
3. She lands on the new event with a full task list. In the side column she opens «+ Legg til hjelper» and adds Ola and Siri by email.
4. She presses «Endre» on «Bestille blomster», moves the deadline a week, chooses Siri as helper and presses «Lagre». She removes a task she does not need with «Slett oppgaven».
5. She copies each helper's link with «Kopier lenke» and sends it in Messenger.
6. **Climax:** in one sitting the gathering has gone from an idea to a plan where every task has a name on it, without her starting from a blank page.

Failure: the date is missing → the form comes back with her input kept and an error under the date field, which gets focus.

Failure: the AI takes too long → the template plan is used after the time limit (NFR-6), and the flash says so.

### Flow 5 — John checks the whole loop in test mode (UJ-4; examiner, own computer)

1. John starts the Docker image with `.env.example`. The header shows «Testinnboks», which only exists in test mode.
2. He logs in as Kari. The Oversikt greets her by the time of day and shows Bryllup with «2 haster» and Utdrikningslag «I rute», from the seed data.
3. He opens Bryllup and sees every part of the event view filled: «Trenger deg nå», Fremdrift with this and next week, helpers and messages. He copies Ola's link and opens it in a private window, answers a task, and sees the change after reloading the event.
4. He creates an event. Without an AI key he gets the fixed mock plan, and the flash says it is a test plan. With the simulated AI failure on, the flash says the template was used (FR-6).
5. He opens «Testinnboks» and presses «Send påminnelser nå». The flash says how many were sent, and the reminder emails appear in the list.
6. **Climax:** he opens a reminder link from an email, presses «Ferdig», and sees the task as Done in the event view. In a few minutes he has seen the whole loop work without keys or network.

Failure: «Send påminnelser nå» with nothing due → the flash says that no reminders were due, and the inbox is unchanged.

## Mock deviations

The mocks in `mockups/` were made while the decisions were being taken. Where they differ from the spines, the spines win:

- `event-view-1.html` shows variant B («Lagre alle»), which was rejected. Only variant A applies.
- `event-view-1.html` shows «Fremdrift» and «Neste uke» as two cards, with «Neste uke» as the next seven days. They are one card with «Denne uka» and «Neste uke» as calendar weeks (Monday–Sunday).
- `event-view-1.html` shows the day labels in brass. They use `{colors.muted}`, because brass is too weak for text.
- `event-view-1.html` shows «Marker som ferdig» only on the Urgent row and not in the edit box. It belongs on every task that is not Done (FR-16).
- All mocks load the fonts from Google Fonts for the preview. The app self-hosts them in `public/fonts/`.
- The mocks show the ornament before option 3 was chosen. Only the framed card with ❧ (DESIGN.md → Components) applies.

## Plan impact

This redesign changes agreed behaviour. Before it is built, these must be updated in the PRD, `epics.md` and the stories, with the reason:

- **Helper page header:** neutral «Du er invitert til å hjelpe til med …» instead of PRD UJ-2 «Kari has invited you to organize …». Kari is still named in the greeting and in each confirmation.
- **Helper buttons:** «Ja, jeg tar den» instead of «Ja».
- **Helper task text:** each card shows the task title and «Frist ‹dato›» instead of the sentence «Kari vil at du skal ‹oppgave› innen ‹dato›» (PRD UJ-2 step 2, `helper.ejs`). Kari is named in the greeting instead.
- **Tab label:** «+ Nytt arrangement» instead of «+ Nytt».
- **Double submit on Nytt arrangement:** the server must not create two events when the form is sent twice while the AI drafts. The architecture step decides how, for example with a one-time form token.
- **Event view summaries (FR-20):** the Done / To do / Timeline / Messages panels become «Trenger deg nå», Fremdrift (with «Denne uka» and «Neste uke») and Meldinger. FR-20's "next deadline" is covered by the week groups and "days until the event" by the title line. Tests that check panel texts must follow.
- **FR-16 kept:** «Marker som ferdig» moves from every row into the edit box and the «Trenger deg nå» rows, so Kari can still mark any task Done.
- **Meldinger:** the side card shows a preview that does not mark replies seen; only `?panel=messages` does (AD-15 unchanged).
- **Task list:** read-only rows with one edit box at a time, instead of a form on every row. The edit box changes title, deadline and helper together, while today saving (`/tasks/:id`) and assigning (`/tasks/:id/assign`) are separate routes; the architecture step decides whether to combine them or keep two forms in the box. Opening a box needs a query parameter on the event route (e.g. `?endre=<taskId>`).
- **Fonts:** three self-hosted font families in `public/fonts/`.
- **Scripts:** a second small external script, besides `copy.js`, disables the create button while drafting (AD-16 allows external scripts).
