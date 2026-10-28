# Gap-analyse mot sensorveiledningen

**Dato:** 2026-10-28 · **Grunnlag:** [docs/sensorveiledning.md](sensorveiledning.md) og repoet slik det sto på `main` etter commit `d343439`.

Én tabell per kriterium i sensorveiledningen, med hva som er oppfylt, hva som mangler og konkrete tiltak.

**Målinger:** `npm test` 254/254 grønne i 14 testfiler · `npm run typecheck` grønn · `npm run lint` 0 feil, 7 advarsler og 1 info · 38 commits, ingen merge-commits. PR-er og issues på GitHub er ikke sjekket, fordi `gh` ikke var installert.

**Oppsummert:** Kodekvaliteten og testene er sterke. De største hullene er arbeidsflyten (ingen pull requests), at to Must-funksjoner fra brief-en ikke er bygget, og at planleggingsdokumentene ikke er oppdatert siden 25.10.

✅ oppfylt · ⚠️ delvis · ❌ mangler

## 1. Prosess og KI-styring (30 %)

| | Funn | Tiltak |
|---|---|---|
| ✅ | Hele BMAD-kjeden finnes: brief, faglærers tilbakemelding, oppdatert brief, PRD med review- og reconcile-filer, arkitektur med 17 AD-er, epics, sprint-status og én spec per story. | — |
| ✅ | Beslutninger er begrunnet: AD-er, Biome i stedet for ESLint, og Docker som leveranse med hosting som valgfritt (`24ca2d6`). | — |
| ✅ | `docs/traceability.md` kobler stories og krav til tester. `deferred-work.md` lister kjente hull med begrunnelse. | — |
| ❌ | **Ingen pull requests eller merges.** Story 1.1–1.6 ble committet rett på `main`. `CLAUDE.md` krever én branch og én pull request per story, men den regelen kom etter story 1.6. | Lag story 2.1 på egen branch og slå den inn med en pull request. Beskrivelsen skal si hvordan endringen er testet og hvilke KI-feil som ble funnet. Forklar i ki-loggen at regelen ble innført etter epic 1. |
| ⚠️ | **Ujevn historikk:** all kode i epic 1 kom 24.–25.10, i seks store commits. Story 1.1 alene er 46 filer og 6462 linjer. | Bygg resten i mindre commits spredt over flere dager, for eksempel test, implementasjon og dokumentasjon hver for seg. |
| ⚠️ | **Ki-loggen har bare 4 rader, og den første er fra 25.10.** Spec-filene har en «Review Triage Log» med feil funnet i KI-kode, men ki-loggen lenker ikke dit. | Før de viktigste funnene fra spec-filene inn i ki-loggen, med lenke til story-commiten. |
| ⚠️ | **`sprint-status.yaml` er ikke oppdatert siden 25.10.** Story 1.1–1.6 står fortsatt som `review`. | Sett ferdige stories til `done`, eller skriv hva som gjenstår. Vurder en retrospektiv for epic 1. |
| ⚠️ | Commitmeldingene blander engelsk og norsk, og noen mangler prefiks (for eksempel «PRD:finalize»). | Hold én konvensjon fremover. Gamle commits trenger ikke endres. |

## 2. Funksjonalitet og omfang (20 %)

| | Funn | Tiltak |
|---|---|---|
| ✅ | Kjerneflyten virker fra start til slutt: mal → plan → hjelpere → lenke → svar på mobil → oversikt. Data lagres i SQLite, og statusreglene er ikke-trivielle. | — |
| ✅ | Appen tåler feil input: 422 med norske meldinger, 404 ved fremmede id-er, gjentatte svar endrer ingenting, og for store forespørsler gir 413. | — |
| ✅ | Det som ikke er bygget, står i «Kjente begrensninger» i README. | — |
| ❌ | **Brief-en kaller AI-utkast og e-postpåminnelser «Must work (version 1)», og ingen av dem er bygget** (epic 2 og 3). Påminnelser beskrives som selve kjernen («follow-through»). | Prioriter story 2.1 (mock-AI med fallback) og 3.1 (påminnelser og testinnboks). Begge kan kjøres uten nøkler. |
| ⚠️ | To mulige feil er ikke sjekket (fra `deferred-work.md`): at to samtidige «legg til hjelper» kan gi 500 eller en sjette hjelper, og at et halvt opprettet arrangement kan bli liggende hvis innsettingen av oppgaver feiler. | Skriv en test som sender parallelle forespørsler, og rett feilen hvis den finnes. |

## 3. Kvalitetssikring og testing (15 %)

| | Funn | Tiltak |
|---|---|---|
| ✅ | 254 meningsfulle tester. Hver test har egen database, fast dato og eksplisitt testmiljø. Statusreglene testes på grensene (dag 6/7, 3/4 dager igjen). | — |
| ✅ | Manuelle tester har fremgangsmåte i `traceability.md`. Det er ingen hemmeligheter i repoet eller historikken; bare `.env.example` er committet. | — |
| ⚠️ | Kodegjennomgangen er dokumentert i spec-filene, men ikke i pull requests (det finnes ingen). | Dekkes av pull requests fra neste story. |
| ⚠️ | Ingen automatisk test for Docker, utklippstavlen, 360 px, eller at `server.ts` selv kjører migrasjonene. | Legg til en røyktest som starter `server.ts` og sjekker `/health`. Vurder én Playwright-test for hjelperflyten. |
| ⚠️ | De manuelle testene har fremgangsmåte, men ingen resultater med dato (bortsett fra Docker i spec 1.6). | Lag en kort testplan med dato, steg og resultat for hver manuelle test. |

## 4. Design og brukeropplevelse (10 %)

| | Funn | Tiltak |
|---|---|---|
| ✅ | Alle sidene har `lang="nb"`, og antallet `<label>` stemmer med antallet skjemafelt i alle skjemaene. Det finnes ingen bilder, så alternativtekst trengs ikke. | — |
| ✅ | Det er tomtilstander («Ingenting haster», «Ingen flere frister», hjelper uten oppgaver) og forståelige norske feilmeldinger. Mobil er tatt hensyn til med et `@media`-brudd ved 720 px og en hjelperside for 360 px. | — |
| ❌ | **Ingen designdokumentasjon:** ingen skisser, wireframes eller UX-dokument. Det eneste sporet er «User Journeys» i PRD-en. | Lag en kort UX-beskrivelse (for eksempel med `bmad-ux`) med skisser av oversikten, arrangementssiden og hjelpersiden. |
| ⚠️ | Kontrast og tastaturnavigasjon er ikke sjekket eller dokumentert. Stilarket har ingen egen fokusstil (den fjerner heller ikke nettleserens). | Sjekk fargene mot WCAG AA og legg til en manuell tastaturtest i testplanen. |

## 5. Kode og arkitektur (10 %)

| | Funn | Tiltak |
|---|---|---|
| ✅ | Mappestrukturen følger arkitekturen (`routes → services → domain`). `domain/` importerer ingen andre prosjektfiler, akkurat som AD-1 krever. | — |
| ✅ | Ingen TODO-er og ingen utkommentert kode. Typecheck er grønn, Biome er satt opp, og config valideres ved oppstart. | — |
| ⚠️ | 7 lint-advarsler og 1 info, i `public/copy.js` og `tests/helpers.test.ts`. Alle kan rettes automatisk. | Kjør `npm run lint:fix` og commit resultatet for seg. |

## 6. README og kjørbarhet (10 %)

| | Funn | Tiltak |
|---|---|---|
| ✅ | README forklarer hva appen er og hvem den er for. Den har Docker-steg først, Node-oppstart med kopierbare kommandoer, Node-versjon (≥ 22.12), testinnlogging, hjelperlenker, «Ting å prøve», begrensninger og testkommandoer. | — |
| ❌ | Ingen skjermbilde. | Legg inn ett eller to skjermbilder (oversikt og hjelperside på mobil). |
| ❌ | Ingen oversikt over mappestrukturen. | Lag en kort mappeoversikt (`src/routes`, `services`, `domain`, `seed/`, `tests/`, `docs/`, `.docs/`). |
| ⚠️ | Miljøvariablene i `.env.example` er ikke forklart i README. | Lag en tabell med variabel, betydning og standardverdi. |
| ⚠️ | Dokumentasjonslisten mangler planleggingsdokumentene (`.docs/planning-artifacts/`), `docs/ki-logg.md` og `CLAUDE.md`. | Legg til lenkene. |
| ⚠️ | `npm run lint` står ikke i README. | Legg den til under «Tester». |

## 7. Ryddighet i repoet (5 %)

| | Funn | Tiltak |
|---|---|---|
| ✅ | `.gitignore` holder `node_modules`, `data/`, `.env` og byggemapper ute. Ingen av dem er committet, verken nå eller tidligere. | — |
| ✅ | Ingen løse testfiler eller sikkerhetskopier, og kode, dokumentasjon og ressurser ligger i hver sine mapper. | — |
| ⚠️ | To dokumentasjonsmapper, `docs/` og `.docs/`, kan forvirre. `.docs/` er skjult og har ingen lenke fra README. | Forklar skillet i README, eller lenk til `.docs/`. |
| ⚠️ | Den gamle branchen `setup/bmad-and-product-brief` ligger fortsatt på GitHub, selv om den er slått inn i `main`. | Slett den, eller la den stå som historikk. |

## Prioriterte tiltak

1. **Arbeidsflyt (30 %):** lag neste story på egen branch med pull request, oppdater sprint-status, og før funnene fra spec-filene inn i ki-loggen.
2. **Omfang (20 %):** bygg story 2.1 og 3.1, så brief-ens Must-krav er dekket.
3. **README og design (20 % til sammen):** legg inn skjermbilder, mappeoversikt, tabell over miljøvariabler og lenker, og en kort UX-beskrivelse.
4. **Rask opprydding:** kjør `npm run lint:fix`.
