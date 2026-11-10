---
name: MasterPlan · Porselen
description: Calm, warm and slightly old-fashioned visual identity for MasterPlan — ivory, navy and porcelain blue with brass details, like a cosy home with blue-and-white china.
status: final
created: 2026-11-10
updated: 2026-11-10
sources:
  - .docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/brief.md
  - .docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/addendum.md
  - .docs/planning-artifacts/prds/prd-MasterPlan-2026-10-19/prd.md
  - .docs/planning-artifacts/prds/prd-MasterPlan-2026-10-19/addendum.md
  - .docs/planning-artifacts/architecture/architecture-MasterPlan-2026-10-24/ARCHITECTURE-SPINE.md
  - .docs/planning-artifacts/epics.md
  - src/views/ and public/styles.css (the UI as built before the redesign)
colors:
  background: '#FAF6EF'
  surface: '#FFFFFF'
  soft: '#EEF2F8'
  text: '#2E2A26'
  muted: '#6F665C'
  navy: '#24365A'
  on-navy: '#FFFFFF'
  link: '#3F5F91'
  brass: '#B58A3E'
  stripe: '#C9D5E6'
  line: '#ECE4D8'
  field-border: '#948876'
  progress: '#8C7353'
  urgent: '#A2512F'
  urgent-bg: '#F7E5DA'
  on-track: '#55704F'
  on-track-bg: '#E6EEE2'
  waiting-bg: '#F1ECE3'
  error: '#A8322D'
typography:
  greeting:
    fontFamily: Dancing Script
    fontSize: 34px
    fontWeight: '500'
    lineHeight: '1.2'
  greeting-mobile:
    fontFamily: Dancing Script
    fontSize: 21px
    fontWeight: '500'
    lineHeight: '1.3'
  display:
    fontFamily: Lora
    fontSize: 34px
    fontWeight: '400'
    lineHeight: '1.2'
  display-mobile:
    fontFamily: Lora
    fontSize: 25px
    fontWeight: '400'
    lineHeight: '1.25'
  headline:
    fontFamily: Lora
    fontSize: 21px
    fontWeight: '400'
    lineHeight: '1.3'
  logo:
    fontFamily: Lora
    fontSize: 21px
    fontWeight: '400'
    lineHeight: '1.2'
  body:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-strong:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.5'
  task-title:
    fontFamily: Source Sans 3
    fontSize: 17px
    fontWeight: '600'
    lineHeight: '1.4'
  meta:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.45'
  label-caps:
    fontFamily: Source Sans 3
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.06em
rounded:
  sm: 8px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  page-max: 1120px
  side-column: 300px
  margin-mobile: 16px
  card-gap: 18px
  plain-max: 420px
  breakpoint: 860px
  touch-min: 48px
components:
  button-primary:
    background: '{colors.navy}'
    text: '{colors.on-navy}'
    rounded: '{rounded.full}'
    minHeight: 40px
    minHeight-helper: '{spacing.touch-min}'
  button-secondary:
    background: transparent
    text: '{colors.navy}'
    border: 1px solid {colors.navy}
    rounded: '{rounded.full}'
  button-quiet:
    text: '{colors.link}'
    decoration: underline
  button-danger:
    text: '{colors.urgent}'
    border: 1px solid {colors.urgent}
    rounded: '{rounded.full}'
  card:
    background: '{colors.surface}'
    rounded: '{rounded.lg}'
    padding: 18px 20px
    shadow: 0 1px 0 {colors.line}, 0 8px 20px rgba(36,54,90,.05)
  card-framed:
    extends: card
    innerRule: 1px solid {colors.line}, inset 6px
    cornerOrnament: '❧ in {colors.brass}'
  card-action:
    extends: card
    borderLeft: 4px solid {colors.urgent}
  pill-urgent:
    background: '{colors.urgent-bg}'
    text: '{colors.urgent}'
  pill-on-track:
    background: '{colors.on-track-bg}'
    text: '{colors.on-track}'
  pill-waiting:
    background: '{colors.waiting-bg}'
    text: '{colors.muted}'
  pill-in-progress:
    background: '{colors.soft}'
    text: '{colors.navy}'
  progress-bar:
    track: '{colors.line}'
    fill: '{colors.progress}'
    height: 6px (overview), 10px (event view)
  header-trim:
    pattern: repeating stripe {colors.stripe} on {colors.background}, 8px high
  input:
    border: 1px solid {colors.field-border}
    rounded: '{rounded.sm}'
    minHeight: 40px
  avatar:
    background: '{colors.soft}'
    text: '{colors.navy}'
    typography: '{typography.headline}'
    size: 38px
---

## Brand & Style

MasterPlan is for people who end up in charge of a big gathering without wanting to be planners. The app should feel like walking into a cozy home: ivory walls, blue-and-white china, a striped armchair, brass lamps and warm evening light. It is **calm, warm, a little old-fashioned and only slightly romantic** (about 1–2 on a 1–5 romance scale), so it suits a fiftieth birthday or a reunion as well as a wedding.

The feeling should make Kari, the organizer, want to arrange something, while the layout keeps her in control: ornament and type give the warmth, and clear counts and short lists give the overview. The opposite of MasterPlan is steel, grey and mechanical. The direction is "Stua i kveldslys" (calm living room) combined with the practical density of "Landkjøkkenet" (country kitchen). The inspiration images are kept locally in `imports/` and are not in git.

This file and `EXPERIENCE.md` are the two *spines* of the UX design: the source of truth for Story 5.1. This file owns how the app looks; `EXPERIENCE.md` owns how it behaves and what it says. Each wins in its own area, and both win over the mocks.

→ Visual references: `.working/directions-1.html` (the four directions; C and D were combined), `mockups/color-themes-1.html` (palette 1 «Porselen»), `.working/progress-colors-1.html` (dark beige progress chosen), `.working/typography-1.html` (headings from pair 1, handwriting from pair 2), `.working/ornaments-1.html` (only option 3 kept), `mockups/event-view-1.html` and `mockups/helper-page-1.html` (key screens). Known differences from the mocks are listed in `EXPERIENCE.md` → Mock deviations.

## Colors

The palette is **Porselen**: blue-and-white china on an ivory table. Light mode only; there is no dark mode.

- **Ivory `{colors.background}`** is the page. Never pure white or grey behind content.
- **Ink `{colors.text}`** is all body text, task titles and form input.
- **White `{colors.surface}`** is for cards and the header, so content sits on "plates".
- **Navy `{colors.navy}`** is for headings, the logo, primary buttons and the current tab.
- **Link blue `{colors.link}`** is only for links and quiet text buttons.
- **Stripe `{colors.stripe}`** (pale porcelain blue) is decorative only: the header stripe. Never text.
- **Brass `{colors.brass}`** is for ornaments only (the fleuron by the logo and the card corner ornament). Never for text: its contrast on ivory is only 2.9:1.
- **Dark beige `{colors.progress}`** fills progress bars. It is deliberately not blue. Its contrast against the track `{colors.line}` is 3.55:1, which meets the 3:1 minimum (WCAG 1.4.11).
- **Terracotta `{colors.urgent}` on `{colors.urgent-bg}`** marks Urgent and Needs a helper. It is muted on purpose: urgent, not alarming.
- **Sage `{colors.on-track}` on `{colors.on-track-bg}`** marks On track and Done.
- **`{colors.waiting-bg}`** with muted text marks Waiting for an answer.
- **Error `{colors.error}`** is only for form validation messages.

Checked contrast (text needs 4.5:1, WCAG 1.4.3; input borders and progress bars need 3:1, WCAG 1.4.11):

| Pair | Ratio |
|---|---|
| Text on ivory | 13.2:1 |
| Muted on ivory / on white | 5.2:1 / 5.6:1 |
| White on navy (primary button) | 12:1 |
| Navy on soft (in-progress pill) | 10.7:1 |
| Link on white / ivory / soft | 6.5:1 / 6.0:1 / 5.7:1 |
| Urgent pill / danger button (urgent on white) | 4.6:1 / 5.6:1 |
| On-track pill | 4.6:1 |
| Waiting pill | 4.8:1 |
| Error on white / soft / urgent-bg | 6.7:1 / 5.9:1 / 5.4:1 |
| Field border on white / ivory / soft | 3.5:1 / 3.2:1 / 3.1:1 |
| Progress fill on track | 3.55:1 |

The field border on soft, inside the edit box, is the tightest pair, so the edit box must not get a darker background.

## Typography

Three families, self-hosted as WOFF2 in `public/fonts/` (all OFL). They are not loaded from Google: the examiner's Docker run must work offline, and helper pages must not call third parties.

- **Lora** (serif) is the voice of the home: the logo, page titles, event names and card headings. Regular weight; never bold.
- **Source Sans 3** (sans) does the work: body text, labels, buttons, counts, dates and form fields.
- **Dancing Script** (handwriting) is used only for greetings and empty-state headlines: the time-of-day greeting on Oversikt («God kveld, Kari») and the short greeting from the organizer on the helper and reminder pages («Så fint at du er med! – Kari»). Never for anything a user must read to act.

Roles:

| Role | Token |
|---|---|
| Greeting on Oversikt | `{typography.greeting}` |
| Greeting on helper and reminder pages, empty-state headlines | `{typography.greeting-mobile}` |
| Page title, event name on the event view | `{typography.display}` |
| Page title on helper pages | `{typography.display-mobile}` |
| Card headings, event names on cards | `{typography.headline}` |
| Logo | `{typography.logo}` |
| Body text, buttons, form fields | `{typography.body}` |
| Counts («15 av 23 ferdig»), banner, task titles on organizer pages | `{typography.body-strong}` |
| Task titles on helper pages | `{typography.task-title}` |
| Dates, helper names, summaries, hints | `{typography.meta}` |
| Group labels («TRENGER HJELPER (2)»), day names, «Svar ønskes» | `{typography.label-caps}` |

Group labels and day names are in `{colors.muted}`. Fallbacks: Georgia for Lora, system-ui for Source Sans 3, cursive for Dancing Script.

## Layout & Spacing

- Organizer pages: a centered column up to `{spacing.page-max}`. The event view has a main column and a `{spacing.side-column}` side column (helpers and messages), which stacks under the main column below `{spacing.breakpoint}`.
- Helper pages are a single column designed for 360 px, with `{spacing.margin-mobile}` side margins and no sideways scrolling.
- Spacing follows a 4 px base (`{spacing.1}`–`{spacing.6}`). Cards are `{spacing.card-gap}` apart; rows inside cards are separated by a 1 px `{colors.line}` rule, not by boxes.
- Generous air is part of the calm. When a surface feels crowded, hide detail behind a disclosure rather than shrinking type.

## Elevation & Depth

Depth is soft and warm, like plates on a tablecloth: a 1 px bottom line in `{colors.line}` plus a wide, faint navy-tinted shadow (`rgba(36,54,90,.05)`, 20 px blur). No hard borders around cards, and no stacked shadows.

## Shapes

Rounded but not bubbly: cards `{rounded.lg}`; flash, answer banner and edit box `{rounded.md}`; inputs and the «Svar ønskes» label `{rounded.sm}`. Buttons and status pills are fully rounded (`{rounded.full}`), like the rim of a cup.

## Components

Shared:

- **Header:** white, with the Lora logo «MasterPlan» and a brass fleuron (❦), the user's name and the links on the right, and an 8 px `{components.header-trim}` stripe underneath.
- **Tabs:** pill links. The current tab is navy with white text; «+ Nytt arrangement» is link blue.
- **Buttons:** primary navy pill; secondary navy outline; quiet link-blue underlined text (used for «Endre»); danger terracotta outline (used for «Slett oppgaven»). Organizer buttons are at least 40 px high; helper buttons at least `{spacing.touch-min}`.
- **Inputs:** white with a `{colors.field-border}` border and a visible label above. Focus: 2 px navy outline.
- **Status pills:** a pill always carries text, never color alone. The words per status are in `EXPERIENCE.md` → Status vocabulary.

  | Pill | Used for |
  |---|---|
  | `{components.pill-urgent}` | Urgent, Needs a helper, Unassigned, Declined, Can't be done |
  | `{components.pill-waiting}` | Open (waiting for an answer) |
  | `{components.pill-in-progress}` | Accepted, not Urgent («I gang», «Du har sagt ja») |
  | `{components.pill-on-track}` | Done, and On track for an event |
- **Flash:** one line at the top of the content, `{rounded.md}`. Confirmations use `{colors.on-track}` on `{colors.on-track-bg}`; errors use `{colors.error}` on `{colors.urgent-bg}`.
- **Empty state:** centered; a Dancing Script headline in navy and one plain sentence in muted text below it.
- **Plain pages** (Siden finnes ikke, Noe gikk galt, Lenken virker ikke): one centered `{components.card}` at most `{spacing.plain-max}` wide, a `{typography.display}` title and a link.

Organizer pages:

- **Cards:** `{components.card}`. Event and summary cards on the overview and the event view use `{components.card-framed}`: a fine inner rule like an old print frame, and a small brass ❧ in the top-right corner. The «Trenger deg nå» card uses `{components.card-action}` with a terracotta left edge.
- **Progress bar:** dark beige fill on a `{colors.line}` track, always next to the same number in text («15 av 23 ferdig»).
- **Helper card:** a round `{components.avatar}` with the first letter in Lora, the name, a one-line summary («5 oppgaver · 1 haster») and a secondary «Kopier lenke» button. The raw URL is not shown, except in the no-JavaScript fallback described in `EXPERIENCE.md` → Component Patterns.
- **Edit box:** an inline panel in `{colors.soft}` that opens under one task row with title, deadline, helper, «Lagre», «Avbryt», «Marker som ferdig» (secondary) and «Slett oppgaven» (danger).

Helper pages:

- **Helper task card:** `{components.card}` on the helper page.
  - *Unanswered:* a 2 px `{colors.navy}` frame and a small «Svar ønskes» label (`{typography.label-caps}`, white on navy, `{rounded.sm}`) above the title.
  - *Title and deadline:* the title in `{typography.task-title}`, the deadline in `{typography.meta}` and `{colors.muted}`.
  - *Answer buttons:* «Ja, jeg tar den» is `{components.button-primary}` and «Nei» `{components.button-secondary}`, side by side at full width and `{spacing.touch-min}` high.
  - *Accepted:* no frame, an in-progress pill «Du har sagt ja», and «Ferdig» / «Kan ikke gjøres» in the same two button styles.
- **Answer banner:** «N oppgaver venter på svaret ditt» in `{colors.urgent}` on `{colors.urgent-bg}`, `{typography.body-strong}`, `{rounded.md}`, full width under the greeting.
- **Changed marker:** «Endret etter at du svarte» on a helper task card, as a `{components.pill-waiting}` pill above the title.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep ivory as the page and white for cards | Use grey backgrounds or steel-blue chrome |
| Use Lora for names and headings, Source Sans 3 for everything you act on | Put handwriting on buttons, labels, dates or counts |
| Use terracotta for urgent, sage for on track | Use bright red, or color as the only signal |
| Use the framed card and ❧ on event and summary cards | Add more ornament (floral backgrounds, gingham and dividers were tried and rejected) |
| Show the number next to every progress bar | Use blue for progress |
| Self-host the fonts | Load fonts or images from third parties |
| Keep brass for ornament | Set any text in brass |
| Write UI text and emails without emoji | Use emoji in UI text or emails |
