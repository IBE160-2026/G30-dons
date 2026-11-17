# Brainstorming og research i planleggingen

## 2026-11-17 kl. 21:50 — FDHimolde

### Oppgave
Sensor nevner brainstorming og research som egne steg i planleggingen. Brukeren ville vite om repoet har dokumenter for dem, hva som ellers dekker dem, og datoene i git-historikken, uten at noe ble laget eller endret. I samme økt ble utviklingsserveren fra story 5.1 stoppet.

### Plan
- Søke i filnavn og innhold i `.docs/`, `docs/`, README og `.logs/`.
- Lese memloggen og addendumet til brief-en, og hente datoene fra `git log --follow`.
- Stoppe `npm run dev` og sjekke at ingenting lytter på port 3000.

### Resultat
- Det finnes ingen egne dokumenter for brainstorming eller research.
- **Research:** `briefs/brief-MasterPlan-2026-09-25/addendum.md`, «Competitive landscape (web research, Sept 2026)» (linje 58–100). Den har en tabell over eksisterende verktøy, AI-trender, klager fra brukere, hva det betyr for MasterPlan, og seks kilder. Kort oppsummert i `brief.md:33–35`.
- **Brainstorming:** `briefs/brief-MasterPlan-2026-09-25/.memlog.md`, beslutningsloggen fra brief-økten. Den viser opprinnelsen, hvordan målgruppen ble smalnet inn, AI-alternativene a–d, endringen i tonen, og idélisten for samarbeid som ble kuttet. PRD-ens memlog (linje 8) sier at det ikke ble gjort ny research i PRD-fasen.
- **Datoer:**
  - Brief, addendum og memlog kom i samme commit, `19b43b0`, 2026-09-25 12:03. Det første repoet ble opprettet 2026-09-07 (`e773e16`).
  - `tilbakemelding-product-brief.md`: `0451527`, 2026-10-06.
  - `reconcile-brief.md`: `2dbfe84`, 2026-10-24.
- **Hull:**
  - Research og brainstorming har ingen egen commit før brief-en.
  - Sesjonsloggene og ki-loggen starter først 2026-10-28.
  - Inspirasjonsbildene til UX-designet (`imports/`) er ikke i git.
- Ingen filer i prosjektet ble laget eller endret, bortsett fra denne loggen og `issues.md`.
- Utviklingsserveren er stoppet. Ingenting lytter på port 3000, og ingen `server.ts`-prosess fra prosjektet kjører.

### Åpne punkter
- Avgjør om brainstorming og research skal forklares der sensor ser dem, for eksempel med en lenke fra README eller ki-loggen til addendumet og memloggen til brief-en. Alternativet er å la det være.
