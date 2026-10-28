# Opprydding etter gap-analyse

## 2026-10-28 kl. 10:51 — FDHimolde

### Oppgave
Følge opp gap-analysen ([docs/gap-analyse-2026-10-28.md](../../docs/gap-analyse-2026-10-28.md)) på branchen `chore/opprydding-etter-gap-analyse`, i fire små commits: lint:fix, sprint-status, beslutning om story 1.7 og README. Test, typecheck og lint skulle kjøres før hver commit. Branchen skulle pushes og få en pull request, men ikke merges før brukeren har sett den.

### Plan
- Én commit per punkt, og `npm test`, `npm run typecheck` og `npm run lint` før hver av dem.
- Beslutningen føres i `docs/ki-logg.md`, siden prosjektet ikke har en egen beslutningslogg.
- Pull requesten lages med `gh` fra `C:\Program Files\GitHub CLI\gh.exe`, fordi `gh` ikke ligger i PATH.

### Resultat
- `261b8d6` style: `npm run lint:fix`, pluss to advarsler som bare hadde «unsafe fix», rettet for hånd. **KI-verktøyfeil funnet:** lint:fix fjernet `'use strict'` i `public/copy.js` fordi Biome tolker filen som en modul (`"type": "module"`), men nettleseren laster den som et vanlig script. Direktivet ble lagt tilbake, og `noRedundantUseStrict` er slått av for `public/` i `biome.jsonc`. Lint er nå uten advarsler.
- `33187e5` docs: story 1.1–1.6 er satt til `done` i sprint-status (spec-filene sto allerede som done). 1.7 er merket som utsatt, og epic 1 står fortsatt som `in-progress`.
- `3cb0895` docs: beslutningen er ført i ki-loggen. Punktene om foreign keys på Turso og HTTPS med `TEST_MODE=false` er flyttet fra `deferred-work.md` til story 1.7 i `epics.md`. Røyktest-punktet fra 1.1 ble stående i `deferred-work.md`.
- `c2d60b5` docs: README har fått tabell over miljøvariabler, lint-kommandoene, mappeoversikt, forklaring på `docs/` og `.docs/`, og lenker til planlegging, ki-logg og `CLAUDE.md`. Alle lenkene er sjekket.
- `cc369f1` docs: `'use strict'`-feilen er ført i ki-loggen med lenke til `261b8d6`.
- Før hver commit: 254/254 tester grønne, typecheck grønn, lint uten funn.
- Branchen er pushet, og pull requesten er https://github.com/IBE160-2026/G30-dons/pull/1. Den er ikke merget; brukeren vil se den først.

### Åpne punkter
- README mangler fortsatt skjermbilder.
- Funnene fra «Review Triage Log» i spec-filene er ikke ført inn i ki-loggen.
