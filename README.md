# G30 — Singleton: MasterPlan

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

MasterPlan hjelper én arrangør med å planlegge store private arrangementer (bryllup, utdrikningslag) sammen med hjelpere. Arrangøren lager planen fra en mal, legger til hjelpere og deler en lenke med hver av dem i en chat. Hjelperne svarer på mobilen uten å logge inn, og arrangøren ser hva som er ferdig, hva som haster og hva som trenger en hjelper.

Repoet inneholder applikasjonen og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Fride Dons

## Kjør med Docker (for sensor)

Krever Docker. Appen kjører i testmodus med standardinnstillingene fra `.env.example`: ingen e-post sendes, ingen nøkler trengs, og databasen er en SQLite-fil inne i containeren. Første gang containeren starter, legges testdata inn.

1. **Bygg** (fra mappen med `Dockerfile`):

   ```bash
   docker build -t masterplan .
   ```

2. **Kjør:**

   ```bash
   docker run --rm --env-file .env.example -p 3000:3000 masterplan
   ```

   Loggen viser testinnloggingen og hjelperlenkene, og til slutt `MasterPlan kjører på http://localhost:3000 (testmodus: på)`.

3. **Åpne** <http://localhost:3000>. <http://localhost:3000/health> svarer `ok`.

4. **Logg inn** med `kari@example.no` / `hemmelig123`. Oversikten viser Bryllupet med oppgaver som haster, og Utdrikningslaget som «I rute».

5. **Stopp og nullstill:** trykk `Ctrl+C` i terminalen (eller `docker stop <container>`). Med `--rm` slettes containeren og dataene, så neste `docker run` starter med nye testdata.

Vil du beholde dataene mellom omstarter, gi containeren et navn og dropp `--rm`:

```bash
docker run --name masterplan --env-file .env.example -p 3000:3000 masterplan
docker stop masterplan      # stopper, dataene beholdes
docker start masterplan     # starter igjen uten ny seed
docker rm -f masterplan     # sletter containeren og dataene
```

Bruker du en annen port på maskinen, for eksempel `-p 8080:3000`, må du også sende med `-e APP_BASE_URL=http://localhost:8080`, ellers peker hjelperlenkene som skrives ut og vises i appen, til port 3000.

Ingen innstillinger eller hemmeligheter er bygget inn i bildet. Alt kommer fra miljøet ved `docker run` (`--env-file` eller `-e`).

## Kom i gang uten Docker (Node)

Krever Node.js 22.12 eller nyere.

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

Appen kjører på <http://localhost:3000>. Databasen lagres i `data/local.db`, og migreringer kjøres automatisk.

`npm run seed` sletter databasefilen og legger inn testdataene på nytt. Den nekter å kjøre hvis ikke `TEST_MODE=true` og `DATABASE_URL` er en `file:`-sti. Stopp alltid appen (`npm run dev`) før du kjører den, uansett operativsystem. På Windows er filen låst mens appen kjører. På Linux og macOS blir filen slettet, men appen fortsetter å bruke den slettede filen og viser ikke de nye testdataene.

## Testinnlogging

| E-post | Passord |
|---|---|
| `kari@example.no` | `hemmelig123` |

Du kan også registrere en ny arrangør på <http://localhost:3000/registrer>.

## Hjelperlenker fra testdataene

Åpne dem i et privat vindu (eller en annen nettleser), så ser du siden slik hjelperen ser den. Ingen innlogging trengs.

| Hjelper | Arrangementer | Lenke |
|---|---|---|
| Ola | Bryllup, utdrikningslag | <http://localhost:3000/h/ola-testlenke-masterplan-seed-01> |
| Kim | Bryllup, utdrikningslag | <http://localhost:3000/h/kim-testlenke-masterplan-seed-02> |
| Siri | Bryllup, utdrikningslag | <http://localhost:3000/h/siri-testlenke-masterplan-seed03> |
| `per@example.no` (uten navn) | Bryllup | <http://localhost:3000/h/per-testlenke-masterplan-seed-04> |

Lenkene er de samme etter hver seed. Hva testdataene inneholder, og hvilke tall appen skal vise, står i [docs/fixtures.md](docs/fixtures.md).

## Ting å prøve

Tallene under stemmer på dagen testdataene lages, og før du har endret noe. En ny `docker run --rm` eller `npm run seed` gir dem igjen.

1. Logg inn som Kari. Oversikten viser «2 haster · 4 trenger hjelper» for Bryllupet og «I rute» for Utdrikningslaget.
2. Åpne Bryllupet. Se panelene Ferdig («15 av 23 ferdig»), Å gjøre, Tidslinje og Meldinger («2 nye svar»).
3. Åpne Meldinger. Svarene listes, de nye er merket «Ny», og etterpå er antallet nye svar 0.
4. Åpne Olas lenke i et privat vindu. Han har «Lage bordkort» som Åpen. Svar **Ja** med en melding.
5. Last oversikten og Bryllupet på nytt hos Kari. «Lage bordkort» trenger ikke lenger hjelper, og svaret er et nytt svar.
6. Åpne Siris lenke. «Bestille kake» viser «Endret etter at du svarte», fordi Kari har flyttet fristen. Velg **Ferdig**.
7. Tildel «Hente antrekk» til en hjelper, og kopier hjelperens lenke med **Kopier lenke**.
8. Tildel «Kjøpe pynt» (avslått av Kim) på nytt til Ola. Kims side viser den ikke lenger.
9. Legg til, endre og slett en oppgave. Merk en oppgave som ferdig selv.
10. Opprett et nytt arrangement fra malen Bryllup eller Utdrikningslag, og se at det får sin egen fane.
11. Legg til én hjelper til i Bryllupet (det har fire). Ved fem hjelpere forsvinner skjemaet, fordi et arrangement kan ha maks fem.

## Kjente begrensninger

- Planen kommer fra malens standardplan. AI-utkastet kommer i Epic 2.
- Ingen e-post: hjelperlenker deles bare ved å kopiere dem. Påminnelser, testinnboksen og «Send påminnelser nå» kommer i Epic 3.
- Hjelperen kan ikke endre et ja til nei (eller omvendt), og arrangøren kan ikke åpne en oppgave på nytt for samme hjelper ennå.
- Arrangementer kan ikke endres eller slettes, og hjelpere kan ikke fjernes ennå.
- Sidene oppdateres ikke av seg selv. Last siden på nytt for å se nye svar.
- Ingen CSRF-tokens eller begrensning på innloggingsforsøk (lav risiko i et kursprosjekt med `sameSite: 'lax'`-informasjonskapsler).
- Appen er ikke publisert på nett ennå (Story 1.7, valgfri).

## Tester

```bash
npm test            # alle automatiske tester, uten nett, nøkler eller Docker
npm run typecheck   # typesjekk
```

Testene bruker sin egen database per test og en fast dato, så de gir samme resultat hver dag, og de endrer aldri testdataene i `data/`.

## Dokumentasjon

- [docs/fixtures.md](docs/fixtures.md): testdataene og de forventede tallene.
- [docs/traceability.md](docs/traceability.md): hvilke tester som dekker hvert krav.
- [docs/cost-and-mock-plan.md](docs/cost-and-mock-plan.md): kostnads- og mock-plan for språkmodell og e-post.
