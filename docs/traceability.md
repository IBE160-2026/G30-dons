# Sporbarhet

Dokumentet har to deler: først kobles hver story i Epic 1 til akseptansekriteriene, koden og testene, deretter kobles hvert krav (FR/NFR) til testene. Alle automatiske tester kjøres med `npm test`. Det som ikke kan testes automatisk uten nettleser eller Docker, er merket **manuell**, med fremgangsmåte.

## Story → akseptansekriterier → kode → tester (Epic 1)

Akseptansekriteriene er forkortet fra `.docs/planning-artifacts/epics.md`. Kodefiler står relativt til `src/` med mindre annet er oppgitt, og testfiler ligger i `tests/`.

**Dekning:** ✅ automatisk testet · ⚠️ delvis automatisk, resten manuelt · ❌ **mangler automatisk test**

| Story | Akseptansekriterium | Kode | Tester | Dekning |
|---|---|---|---|---|
| 1.1 | Fersk klon: `npm install`, kopier `.env.example`, `npm run dev`; migrasjoner kjøres automatisk og `GET /health` gir 200. Stack, mappestruktur, `.gitignore` og `.node-version` følger arkitekturen | `server.ts`, `app.ts`, `db/client.ts`, `db/migrate.ts`, `db/migrations/0000_organizers.sql` | `app.test.ts`, `db.test.ts` | ⚠️ `/health` og migrasjoner testes via `createApp`. **Manuell:** selve `npm run dev`, stack-versjoner og mappestruktur (følg Quick Start i `README.md`). |
| 1.1 | Registrering lagrer e-post med små bokstaver og saltet scrypt-hash, og logger inn (FR1) | `services/auth.ts`, `routes/organizer/auth.ts`, `views/register.ejs` | `auth.test.ts` | ✅ |
| 1.1 | Samme norske feil for feil passord og ukjent e-post; utlogging tømmer økten (FR1) | `services/auth.ts`, `routes/organizer/auth.ts`, `views/login.ejs` | `auth.test.ts` | ✅ |
| 1.1 | Arrangørsider sender til innlogging når man ikke er logget inn (FR1, NFR2) | `routes/middleware.ts` | `auth.test.ts` | ✅ |
| 1.1 | A får 404 for B sine id-er, og ingen av B sine data vises (FR2) | `routes/middleware.ts`, `views/404.ejs` | `events.test.ts`, `helpers.test.ts`, `helperPage.test.ts`, `summaries.test.ts` | ✅ Story 1.1 hadde ingen ressurser med id ennå, så kriteriet testes med ressursene fra 1.2–1.5. |
| 1.1 | `npm test` bruker eksplisitt testmiljø, fersk SQLite-fil og fast klokke; `config.ts` validerer alle innstillinger (FR27, FR23, AD-10) | `config.ts`, `clock.ts` | `config.test.ts`, `dates.test.ts`; oppsett i `helpers.ts` og `globalSetup.ts` | ✅ |
| 1.1 | Øktcookien er `httpOnly` og `sameSite=lax`, og helmet er på (AD-16) | `app.ts` | `app.test.ts` | ✅ |
| 1.2 | Arrangement fra Bryllup- eller Utdrikningslag-malen; oppgavene lages fra `defaultPlan` som Unassigned; malene valideres med zod ved oppstart (FR3, FR6, AD-8) | `services/events.ts`, `services/plans.ts`, `domain/plan.ts`, `templates/index.ts`, `templates/wedding.json`, `templates/bachelorette.json`, `routes/organizer/events.ts`, `views/event-new.ejs` | `events.test.ts`, `plan.test.ts` | ✅ |
| 1.2 | En malfrist før i dag settes til i dag (FR5, AD-8) | `domain/plan.ts` | `plan.test.ts`, `events.test.ts` | ✅ |
| 1.2 | A får 404 for B sine arrangementer og oppgaver, og ingenting endres (FR2) | `routes/organizer/events.ts`, `services/events.ts`, `services/tasks.ts` | `events.test.ts` | ✅ |
| 1.2 | Uten dato eller med dato i fortiden: ikke opprettet, norsk feil med HTTP 422 (FR3) | `services/events.ts`, `domain/errors.ts`, `routes/organizer/events.ts` | `events.test.ts` | ✅ |
| 1.2 | Hvert arrangement har sin egen fane (FR4) | `views/partials/event-tabs.ejs` | `events.test.ts` | ✅ |
| 1.2 | Legge til, gi nytt navn, endre frist og slette oppgaver; nye er Unassigned; sletting sletter relaterte rader med `PRAGMA foreign_keys=ON` (FR7, AD-2, AD-12) | `services/tasks.ts`, `routes/organizer/events.ts`, `views/event.ejs`, `db/client.ts`, `db/migrations/0001_events_and_tasks.sql` | `events.test.ts`, `app.test.ts` | ✅ |
| 1.3 | Legge til hjelper: e-post trimmes og får små bokstaver, 24-byte base64url-token; samme e-post på et annet arrangement gjenbruker hjelper og token; sjette hjelper avvises (FR8, AD-5) | `services/helpers.ts`, `routes/organizer/events.ts`, `views/event.ejs`, `db/migrations/0002_helpers.sql` | `helpers.test.ts` | ✅ 24 byte i base64url er 32 tegn, som testen sjekker. |
| 1.3 | Tildeling gjør oppgaven Open med `assigned_at = now`; en hjelper som ikke er knyttet til arrangementet, avvises (FR9, AD-2) | `domain/taskRules.ts`, `services/tasks.ts` | `helpers.test.ts`, `taskRules.test.ts` | ✅ |
| 1.3 | **Kopier lenke** kopierer hele hjelperlenken via `public/copy.js`, uten inline-script, med et skrivebeskyttet felt som reserve (FR10, AD-16) | `public/copy.js` (utenfor `src/`), `routes/paths.ts`, `views/event.ejs` | `helpers.test.ts`, `db.test.ts` (`absoluteUrl`) | ⚠️ Knappen, scriptet og feltet testes. **Manuell:** klikk «Kopier lenke» i en nettleser, lim inn, og sjekk at hele lenken kom med. |
| 1.3 | Ny tildeling gjør oppgaven Open for B med ny `assigned_at`, `accepted_at` tømmes, og A sin oppgaveliste viser den ikke lenger (FR11, AD-2) | `domain/taskRules.ts`, `services/tasks.ts`, `services/helpers.ts` | `helpers.test.ts`, `taskRules.test.ts` | ✅ |
| 1.3 | Hjelpere vises med navn, eller e-post når navn mangler | `views/event.ejs` | `helpers.test.ts` | ✅ |
| 1.3 | A får 404 når A legger til, tildeler til eller kopierer lenken til B sine hjelpere (FR2) | `routes/organizer/events.ts`, `services/helpers.ts` | `helpers.test.ts` | ✅ |
| 1.4 | Gyldig lenke viser overskrift og alle hjelperens oppgaver unntatt Unassigned, gruppert per arrangement og sortert etter frist, på 360 px uten sidelengs rulling; svaret har `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer` og generiske Open Graph-tagger (FR12, NFR1, NFR9, AD-6) | `routes/helper.ts`, `views/helper.ejs`, `views/partials/helper-top.ejs`, `services/helpers.ts`, `public/styles.css` (utenfor `src/`) | `helperPage.test.ts` | ⚠️ Innhold, sortering og hoder testes. 360 px testes bare indirekte (ingen faste bredder over 360 px i stilarket). **Manuell:** åpne en hjelperlenke i mobilvisning med 360 px bredde. |
| 1.4 | Endret, tilfeldig eller feilformet token gir en generisk «lenken er ikke gyldig»-side uten data (FR12) | `routes/helper.ts`, `views/helper-invalid.ejs` | `helperPage.test.ts` | ✅ |
| 1.4 | En GET mot hjelpersiden endrer aldri data (FR12, AD-6) | `routes/helper.ts` | `helperPage.test.ts` | ✅ |
| 1.4 | **Ja** eller **Nei** på en Open oppgave gir Accepted (`accepted_at = now`) eller Declined og nøyaktig én `messages`-rad; samme svar uten melding endrer ingenting (FR13, AD-2) | `domain/taskRules.ts`, `services/tasks.ts`, `db/migrations/0003_messages.sql` | `helperPage.test.ts`, `taskRules.test.ts` | ✅ |
| 1.4 | **Ferdig** eller **Kan ikke gjøres** på en Accepted oppgave gir Done eller Can't be done og én melding (FR15) | `domain/taskRules.ts`, `services/tasks.ts` | `helperPage.test.ts`, `taskRules.test.ts` | ✅ |
| 1.4 | En POST for en oppgave som ikke er (lenger) hjelperens, avvises og endrer ingenting; en oppgave som er tildelt en annen, vises ikke lenger (FR11, FR12, AD-6) | `routes/helper.ts`, `domain/taskRules.ts`, `services/tasks.ts` | `helperPage.test.ts`, `taskRules.test.ts` | ✅ |
| 1.4 | Arrangøren markerer en oppgave Done uten at det skrives en melding (FR16) | `routes/organizer/events.ts`, `domain/taskRules.ts`, `services/tasks.ts` | `helperPage.test.ts`, `taskRules.test.ts` | ✅ |
| 1.4 | Endret tittel eller frist på en Accepted oppgave beholder statusen og setter `changed_since_answer`; hjelpersiden viser «Endret etter at du svarte» til neste svar (FR7, AD-13) | `services/tasks.ts`, `domain/taskRules.ts`, `views/helper.ejs` | `helperPage.test.ts`, `taskRules.test.ts` | ✅ |
| 1.5 | `domain/status.ts` utleder Urgent, Needs a helper, On track og tidligere arrangementer etter AD-3/FR21; all datoregning via `domain/dates.ts` med grensetester (dag 6/7, 3/4 dager igjen, i dag/i går) (AD-4) | `domain/status.ts`, `domain/dates.ts` | `status.test.ts`, `dates.test.ts` | ✅ |
| 1.5 | Første side viser én oppsummering per arrangement: **I rute**, eller antall som haster og trenger hjelper (FR19) | `services/summaries.ts`, `routes/organizer/overview.ts`, `routes/organizer/summaryText.ts`, `views/overview.ejs` | `summaries.test.ts`, `seed.test.ts` | ✅ |
| 1.5 | Arrangementsvisningen viser infoboks, Done («N av M ferdig»), To do, Timeline og Messages (FR20) | `services/summaries.ts`, `routes/organizer/events.ts`, `routes/organizer/summaryText.ts`, `views/event.ejs` | `summaries.test.ts`, `seed.test.ts` | ✅ |
| 1.5 | Meldingspanelet (`?panel=messages`) lister svarene, og bare radene som vises, får `seen_at = now` (AD-15) | `services/messages.ts`, `routes/organizer/events.ts`, `views/event.ejs` | `summaries.test.ts` | ✅ |
| 1.5 | Etter at en hjelper har svart, viser en ny lasting den nye tilstanden, uten sanntids-push (FR22) | `services/summaries.ts` | `summaries.test.ts` | ✅ |
| 1.6 | `npm run seed` med `TEST_MODE=true` og `file:`-database nullstiller fila og bygger testdata via tjenestene: testarrangør, Bryllup og Utdrikningslag med felles hjelpere, oppgaver i alle statuser; Utdrikningslaget er I rute og Bryllupet har oppgaver som haster; faste token (FR25, AD-11) | Ingen i `src/`: `seed/seed.ts`, `seed/fixture.ts`, `seed/run.ts`, `seed/command.ts` (bruker `services/*`) | `seed.test.ts` | ✅ |
| 1.6 | Seed nekter med `TEST_MODE=false` eller en database som ikke er `file:`, med en tydelig melding (AD-11) | `seed/command.ts`, `db/client.ts` | `seed.test.ts` | ✅ |
| 1.6 | Én test sjekker tallene mot `EXPECTED_COUNTS`, og én sjekker hver seedet oppgave med `assertFieldInvariant` (AD-11) | `seed/fixture.ts`, `domain/taskRules.ts` | `seed.test.ts` | ✅ |
| 1.6 | Docker: `docker build` og `docker run --env-file .env.example` starter i testmodus med seed ved første start; data overlever omstart av samme container; ingen `.env` eller hemmeligheter i imaget (FR33, FR25, AD-17) | Ingen i `src/`: `Dockerfile`, `.dockerignore`, `seed/docker-start.ts` | `seed.test.ts` (`startupSeedDecision`) | ❌ **Mangler automatisk test** for bygging og kjøring av imaget; bare beslutningen om seed ved oppstart er testet. **Manuell:** se FR-33 under. Resultatet av den manuelle kjøringen står i `.docs/implementation-artifacts/spec-1-6-seed-data-docker-and-examiner-guide.md`. |
| 1.6 | Repoet har README med Docker-steg og Quick Start, `docs/fixtures.md`, `docs/traceability.md`, `docs/cost-and-mock-plan.md`, `.env.example`, `Dockerfile` og `.dockerignore` (FR28, FR33) | Ingen i `src/` (dokumentasjon og konfig) | `seed.test.ts` (`docs/fixtures.md`), `config.test.ts` (standardinnstillinger) | ⚠️ Bare tallene i `docs/fixtures.md` og standardinnstillingene testes. **Manuell:** les `README.md` og `.env.example`. |

**Oppsummert:** Alle seks stories har automatiske tester. Ett akseptansekriterium mangler automatisk test (Docker-imaget i 1.6), og fire er bare delvis automatisert (oppstart med `npm run dev` i 1.1, utklippstavlen i 1.3, 360 px i 1.4 og README-innholdet i 1.6).

## Krav → tester

### Bygget så langt

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

### Ikke bygget ennå

| Krav | Kommer i |
|---|---|
| FR-5 (AI-utkast), FR-6 (fallback fra AI), FR-23 (mock-AI) | Epic 2 |
| FR-10 (e-post), FR-17, FR-18, FR-24, FR-26 | Epic 3 |
| FR-14, FR-29, FR-30, FR-31, FR-32 | Senere epics |
