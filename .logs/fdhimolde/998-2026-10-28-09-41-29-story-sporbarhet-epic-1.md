# Story-sporbarhet for epic 1

## 2026-10-28 kl. 09:41 — FDHimolde

### Oppgave
Lage en tabell i `docs/traceability.md` som kobler hver story i epic 1 (1.1–1.6) til akseptansekriteriene, filene i `src/` og testene som dekker dem. Bare det som faktisk finnes i repoet skulle med, og stories som mangler tester skulle markeres tydelig.

### Plan
- Hente akseptansekriteriene fra `.docs/planning-artifacts/epics.md`.
- Finne hvilke filer hver story la til eller endret ut fra story-commitene (`219f905`, `2dca733`, `094c752`, `27f2ee1`, `116d579`, `961a53e`).
- Koble hvert kriterium til konkrete tester i `tests/` ved å lese testnavn og -innhold.
- Vise tabellen for brukeren før commit.

### Resultat
- `docs/traceability.md` fantes allerede (FR → tester, fra story 1.6). Den ble ikke overskrevet. Ny seksjon «Story → akseptansekriterier → kode → tester (Epic 1)» ligger øverst, og den gamle tabellen står uendret under «Krav → tester».
- 37 rader, én per akseptansekriterium, med dekningsmerke (✅ / ⚠️ / ❌).
- Alle seks stories har automatiske tester. Docker-imaget i 1.6 mangler automatisk test (❌). `npm run dev` (1.1), utklippstavlen (1.3), 360 px (1.4) og README-innholdet (1.6) er bare delvis automatisert (⚠️).
- Story 1.6 har ingen filer i `src/`; `seed/`, `Dockerfile` og `public/` er tatt med og merket.
- Brukeren valgte commitmeldingen «docs: legg til story-sporbarhet for epic 1» i stedet for «opprett», siden fila fantes. Commit `9834ea1`.
- `npm run lint`: 7 advarsler og 1 info, ingen feil.
- KI-loggen er oppdatert med en rad om at fila fantes fra før og om commitmeldingen, med lenke til `9834ea1`. Commit `24fa755`.
- Alle commitene fra økten (traceability, KI-logg og sesjonslogg) er pushet til `origin/main`.

### Åpne punkter
- Docker-imaget (story 1.6, FR33) har ingen automatisk test; bare `startupSeedDecision` testes. Bygging og kjøring sjekkes manuelt.
