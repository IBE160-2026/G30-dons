# Testdata (fixture)

Testdataene lages av `npm run seed` (og automatisk ved første oppstart i Docker). Koden ligger i `seed/seed.ts`, og forventede tall i `seed/fixture.ts` (`EXPECTED_COUNTS`). Testen `tests/seed.test.ts` sjekker at tabellen under har de samme tallene, og at appen viser dem (FR-25, AD-11).

Alle datoer regnes fra dagen seed kjøres, så tallene er de samme uansett dato.

## Innlogging

| E-post | Passord | Navn |
|---|---|---|
| `kari@example.no` | `hemmelig123` | Kari |

## Arrangementer

| Arrangement | Mal | Dato | Opprettet | Hjelpere |
|---|---|---|---|---|
| Bryllupet til Kari og Jon | Bryllup | om 21 dager | for 60 dager siden | Ola, Kim, Siri, `per@example.no` |
| Utdrikningslag for Lise | Utdrikningslag | om 45 dager | for 20 dager siden | Ola, Kim, Siri |

Ola, Kim og Siri er de samme hjelperne i begge arrangementene, med én lenke hver. Per har ikke noe navn, så appen viser e-postadressen hans.

## Forventede tall rett etter seed

| Arrangement | Oppgaver | Ikke tildelt | Åpen | Akseptert | Avslått | Ferdig | Kan ikke gjøres | Haster | Trenger hjelper | Ferdig (N) | Nye svar |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Bryllupet til Kari og Jon | 23 | 1 | 2 | 3 | 1 | 15 | 1 | 2 | 4 | 15 | 2 |
| Utdrikningslag for Lise | 16 | 0 | 0 | 10 | 0 | 6 | 0 | 0 | 0 | 6 | 1 |

«Ferdig (N)» er N i panelet «N av M ferdig», der M er antall oppgaver: «15 av 23 ferdig» for Bryllupet og «6 av 16 ferdig» for Utdrikningslaget.

Oversikten viser derfor **Bryllupet** med «2 haster · 4 trenger hjelper» og **Utdrikningslaget** som «I rute».

## Hva som ligger bak tallene (Bryllupet)

| Oppgave | Status | Hvorfor |
|---|---|---|
| De 15 første oppgavene i malen | Ferdig | Tildelt for 58 dager siden. Kari markerte to av dem ferdige selv, hjelperne resten. |
| Bestille kake | Akseptert, **haster** | Siri sa ja for 29 dager siden. Kari flyttet fristen til om 2 dager for 2 dager siden, så Siri ser «Endret etter at du svarte». |
| Planlegge bordplassering | Akseptert, **haster** | Frist i dag. Ola sa ja for 13 dager siden. |
| Pynte lokalet | Akseptert | Frist om 20 dager. Per sa ja for 8 dager siden. |
| Lage bordkort | Åpen, **trenger hjelper** | Tildelt Ola for 10 dager siden uten svar (7 dager eller mer). |
| Bekrefte alle leverandører | Åpen | Tildelt Kim for 2 dager siden, frist om 14 dager. |
| Kjøpe pynt | Avslått, **trenger hjelper** | Kim sa nei i går, med melding (nytt svar). |
| Lage program for dagen | Kan ikke gjøres, **trenger hjelper** | Siri sa ja, og meldte i går at hun ikke kan (nytt svar). |
| Hente antrekk | Ikke tildelt, **trenger hjelper** | Ingen hjelper ennå. |

Kari åpnet meldingene for 3 dager siden, så de eldre svarene er lest. De to svarene fra i går er nye.

## Hva som ligger bak tallene (Utdrikningslaget)

Alle 16 oppgavene ble tildelt Ola, Kim og Siri for 19 dager siden, og alle sa ja dagen etter. De seks første er ferdige. Ingen akseptert oppgave har frist innen 3 dager, så ingenting haster. Kari åpnet meldingene for 4 dager siden. I går skrev Siri en melding på «Lage matplan» uten å endre status, og det er det ene nye svaret.

## Hjelperlenker

| Hjelper | Lenke |
|---|---|
| Ola | <http://localhost:3000/h/ola-testlenke-masterplan-seed-01> |
| Kim | <http://localhost:3000/h/kim-testlenke-masterplan-seed-02> |
| Siri | <http://localhost:3000/h/siri-testlenke-masterplan-seed03> |
| `per@example.no` | <http://localhost:3000/h/per-testlenke-masterplan-seed-04> |

Lenkene er faste og virker igjen etter en ny seed. De er bare for testdata.
