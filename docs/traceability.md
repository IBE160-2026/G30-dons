# Sporbarhet: krav → tester

Tabellen viser hvilke tester som dekker hvert krav (FR) som er bygget i Epic 1 (Story 1.1–1.6). Alle automatiske tester kjøres med `npm test`. Krav som ikke kan testes automatisk uten nettleser, er merket **manuell**, med fremgangsmåte.

## Bygget så langt

| Krav | Hva | Testfiler | Merknad |
|---|---|---|---|
| FR-1 | Opprette konto, logge inn og ut | `tests/auth.test.ts` | Samme feilmelding for feil passord og ukjent e-post; innlogging kreves. |
| FR-2 | Hver arrangør ser bare sine egne data | `tests/events.test.ts`, `tests/helpers.test.ts`, `tests/helperPage.test.ts`, `tests/summaries.test.ts` | Andres id-er gir 404 og endrer ingenting. |
| FR-3 | Opprette arrangement fra mal | `tests/events.test.ts`, `tests/plan.test.ts` | Dato i fortiden avvises. |
| FR-4 | Flere arrangementer samtidig, én fane hver | `tests/events.test.ts` | |
| FR-5 | Plan med frister (malens plan) | `tests/plan.test.ts`, `tests/events.test.ts` | Frister før i dag settes til i dag. AI-utkastet kommer i Epic 2. |
| FR-6 | Malens standardplan | `tests/plan.test.ts`, `tests/events.test.ts` | Malene valideres ved oppstart. Fallback fra AI kommer i Epic 2. |
| FR-7 | Redigere planen | `tests/events.test.ts`, `tests/helperPage.test.ts` | Legge til, endre, slette; endring av akseptert oppgave merkes (AD-13). Påminnelser kommer i Epic 3. |
| FR-8 | Legge til hjelpere på e-post | `tests/helpers.test.ts` | Maks fem; samme e-post gir samme hjelper og lenke. |
| FR-9 | Tildele oppgave | `tests/helpers.test.ts`, `tests/taskRules.test.ts` | |
| FR-10 | Kopiere hjelperlenken | `tests/helpers.test.ts` + **manuell** | Testen sjekker knappen, `copy.js` og den skrivebeskyttede lenken. **Manuell:** klikk «Kopier lenke» i en nettleser, lim inn, og sjekk at hele lenken kom med. E-post kommer i Epic 3. |
| FR-11 | Tildele på nytt | `tests/helpers.test.ts`, `tests/helperPage.test.ts`, `tests/taskRules.test.ts` | Den gamle hjelperens side viser ikke lenger oppgaven. |
| FR-12 | Tilgang med lenke | `tests/helperPage.test.ts`, `tests/helpers.test.ts`, `tests/seed.test.ts` | GET endrer aldri data; ugyldige lenker viser ingenting; 24 tilfeldige byte. |
| FR-13 | Svare ja eller nei | `tests/helperPage.test.ts`, `tests/taskRules.test.ts`, `tests/summaries.test.ts` | Svaret vises som nytt svar i arrangementet. |
| FR-15 | Ferdig eller Kan ikke gjøres | `tests/helperPage.test.ts`, `tests/taskRules.test.ts` | |
| FR-16 | Arrangøren markerer ferdig | `tests/helperPage.test.ts`, `tests/taskRules.test.ts` | |
| FR-19 | Oversikt over alle arrangementer | `tests/summaries.test.ts`, `tests/seed.test.ts` | Med testdata: Utdrikningslaget «I rute», Bryllupet «haster». |
| FR-20 | Oppsummeringer i arrangementet | `tests/summaries.test.ts`, `tests/seed.test.ts` | Med testdata gir hver oppsummering tallene i `docs/fixtures.md`. |
| FR-21 | Statusregler | `tests/status.test.ts`, `tests/dates.test.ts` | Oslo-dato, 7-dagers- og 3-dagersreglene, tidligere arrangementer. |
| FR-22 | Oppdatert ved neste lasting | `tests/summaries.test.ts` | |
| FR-25 | Testdata | `tests/seed.test.ts` | Tall som `EXPECTED_COUNTS`, to ulike seed-dager, gyldige rader, ny seed gir samme lenker, avvisning uten testmodus eller med `libsql://`. |
| FR-27 | Automatiske tester | alle `tests/*.test.ts`, særlig `tests/config.test.ts` og `tests/seed.test.ts` | Hjelpemodulen `tests/helpers.ts` gir hver test egen database, eksplisitt testmiljø og fast dato (1. november 2026). Ingen nett eller nøkler. |
| FR-28 | Oppsett og dokumentasjon | `tests/config.test.ts`, `tests/seed.test.ts` + **manuell** | Testene sjekker standardinnstillingene og at `docs/fixtures.md` har de riktige tallene. **Manuell:** les `README.md` og `.env.example`. |
| FR-33 | Levering med Docker | **manuell** | `docker build -t masterplan .` og `docker run --rm --env-file .env.example -p 3000:3000 masterplan`, deretter `/health`, testinnlogging og oversikten. `npm test` bruker ikke Docker. Resultatet av den manuelle kjøringen står under «Implementation Notes» i `.docs/implementation-artifacts/spec-1-6-seed-data-docker-and-examiner-guide.md`. |
| NFR-1 | Hjelpersiden på mobil fra 360 px | `tests/helperPage.test.ts` (indirekte) + **manuell** | Den automatiske testen er bare en indirekte sjekk: den ser etter at stilarket ikke har faste bredder over 360 px. Selve kravet sjekkes manuelt. **Manuell:** åpne en hjelperlenke i nettleserens mobilvisning med 360 px bredde, og sjekk at siden ikke kan rulles sidelengs og at knappene er lette å trykke på. |
| NFR-2 | Sikkerhet | `tests/auth.test.ts`, `tests/app.test.ts`, `tests/helperPage.test.ts` | Saltede scrypt-hasher, helmet, sikre informasjonskapsler, hjelperhoder. |

## Ikke bygget ennå

| Krav | Kommer i |
|---|---|
| FR-5 (AI-utkast), FR-6 (fallback fra AI), FR-23 (mock-AI) | Epic 2 |
| FR-10 (e-post), FR-17, FR-18, FR-24, FR-26 | Epic 3 |
| FR-14, FR-29, FR-30, FR-31, FR-32 | Senere epics |
