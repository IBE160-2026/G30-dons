# CLAUDE.md

## Kvalitetsgrunnlag

Sensorveiledningen er kvalitetsgrunnlaget for alt arbeid i prosjektet:

@docs/sensorveiledning.md

### Kvalitetskrav

- **Prosess og KI-styring (30 %):** Hold BMAD-dokumentene (brief, PRD, arkitektur, epics, stories) oppdatert når koden endres. Hver funksjon skal kunne spores til et krav eller en story, og avvik fra planen skal forklares. Lag små, avgrensede commits med beskrivende meldinger, og dokumenter valg av teknologi og arkitektur med begrunnelse.
- **Funksjonalitet og omfang (20 %):** Kjerneflytene i brief og README skal fungere fra start til slutt. Appen skal tåle feil input og gjentatte handlinger uten å krasje. Det som er utelatt eller endret, skal beskrives og begrunnes.
- **Kvalitetssikring og testing (15 %):** Skriv automatiserte tester som tester meningsfull logikk, ikke trivialiteter. Valider input, håndter feil, og legg aldri hemmeligheter i koden.
- **Design og brukeropplevelse (10 %):** Hold det visuelle uttrykket konsistent, og gi forståelige tilbakemeldinger, feilmeldinger og tomtilstander. Ivareta grunnleggende universell utforming (kontrast, tastaturnavigasjon, alternativtekst, skjemaetiketter) og tilpass til mobilskjerm.
- **Kode og arkitektur (10 %):** Mappestrukturen skal samsvare med arkitekturdokumentet. Bruk beskrivende navn, unngå duplisering, og fjern død kode og utkommenterte rester fra tidligere KI-forsøk.
- **README og kjørbarhet (10 %):** En fremmed skal kunne kjøre appen ved å følge README med kopierbare kommandoer. Hold README oppdatert med forutsetninger, miljøvariabler (`.env.example`), testdata og hvordan testene kjøres.
- **Ryddighet i repoet (5 %):** Ingen hemmeligheter, `.env`-filer, `node_modules`, byggeartefakter, sikkerhetskopier eller løse testfiler i repoet.

### Arbeidsflyt

1. Skriv testene ut fra akseptansekriteriene i storyen før implementasjonen starter.
2. Lag hver story på en egen branch, og slå den inn med en pull request. Beskrivelsen av pull requesten skal forklare hvordan endringen er testet, og hvilke feil som ble funnet i KI-generert kode.
3. Noter hvert KI-forslag som ble rettet, avvist eller presisert i `docs/ki-logg.md`, med lenke til commiten der det skjedde.
4. Kjør `npm run lint` (Biome) før hver commit, og rett alle feil den finner. `npm run lint:fix` retter formatering og importrekkefølge automatisk.

### Definition of Done

En story eller endring er ferdig når:

1. Akseptansekriteriene i storyen er oppfylt, og endringen kan spores til storyen (oppdater `docs/traceability.md`).
2. Det finnes automatiserte tester for ny logikk, og `npm test` og `npm run typecheck` går grønt.
3. Input valideres, feil håndteres med forståelige meldinger, og ingen hemmeligheter er lagt til.
4. UI-endringer har konsistent utseende, tomtilstander og grunnleggende tilgjengelighet, og fungerer på mobilbredde.
5. Det finnes ingen død kode, duplisering eller utkommenterte rester.
6. README og planleggingsdokumentene er oppdatert hvis endringen påvirker oppsett, bruk eller plan, og avvik fra planen er forklart.
7. Endringen er committet i små, avgrensede commits med beskrivende meldinger.
