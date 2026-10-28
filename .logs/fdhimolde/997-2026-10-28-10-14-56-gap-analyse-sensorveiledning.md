# Gap-analyse mot sensorveiledningen

## 2026-10-28 kl. 10:14 — FDHimolde

### Oppgave
Gå gjennom repoet mot `docs/sensorveiledning.md` uten å endre noe, og lage én tabell per kriterium med hva som er oppfylt, hva som mangler og konkrete tiltak. Tabellene skulle deretter lagres som et dokument og committes.

### Plan
- Undersøke commit-historikk, brancher og merges, rotmappen og om hemmeligheter finnes i historikken.
- Kjøre `npm test`, `npm run typecheck` og `npm run lint`.
- Lese README, `.env.example`, sprint-status, `deferred-work.md`, brief-en, arkitektur-spine og visningene (tilgjengelighet).
- Vise tabellene i chat først, og lagre dem i fil etter godkjenning.

### Resultat
- Lagret som [docs/gap-analyse-2026-10-28.md](../../docs/gap-analyse-2026-10-28.md), commit `52e5516`.
- Målinger: 254/254 tester grønne, typecheck grønn, lint med 0 feil, 7 advarsler og 1 info. 38 commits, ingen merges. PR-er og issues er ikke sjekket, fordi `gh` ikke er installert.
- Hovedfunn: ingen pull requests (stories committet rett på `main`); AI-utkast og påminnelser, som brief-en kaller Must, er ikke bygget; sprint-status og ki-logg er ikke oppdatert; README mangler skjermbilde, mappeoversikt og forklaring av miljøvariablene; ingen UX-dokumentasjon.
- Sterke sider: mappestrukturen følger arkitekturen (`domain/` er ren), ingen død kode, gode tester, ingen hemmeligheter i historikken.
- Selve gjennomgangen endret ingen filer; `git status` var ren før lagring.
- Gap-analysen og sesjonsloggen er pushet til `origin/main`.

### Åpne punkter
- Bruk egen branch og pull request fra story 2.1, og forklar i ki-loggen at regelen kom etter epic 1.
- Oppdater `sprint-status.yaml` (story 1.1–1.6 står som `review`) og før funnene fra «Review Triage Log» i spec-filene inn i ki-loggen.
- Bygg story 2.1 (AI-utkast med mock og fallback) og 3.1 (påminnelser og testinnboks), som brief-en kaller Must.
- README: skjermbilder, mappeoversikt, tabell over miljøvariabler, lenker til `.docs/`, ki-logg og `CLAUDE.md`, og `npm run lint`.
- Lag en kort UX-beskrivelse med skisser, og sjekk kontrast og tastaturnavigasjon.
- Kjør `npm run lint:fix` for de 7 advarslene og den ene info-meldingen.
