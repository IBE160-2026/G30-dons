Sensorveiledning – IBE160 Programmering med KI

Applikasjonen vurderes ut fra sju kriterier. Denne filen er kvalitetsgrunnlaget for alt arbeid i prosjektet.

Vekting
Kriterium	Vekt
1. Prosess og KI-styring	30 %
2. Funksjonalitet og omfang	20 %
3. Kvalitetssikring og testing	15 %
4. Design og brukeropplevelse	10 %
5. Kode og arkitektur	10 %
6. README og kjørbarhet	10 %
7. Ryddighet i repoet	5 %
Totalt	100 %
1. Prosess og KI-styring (30 %)

Sensor ser etter:

Planlegging: BMAD-dokumenter (f.eks. Brief, PRD, arkitektur, epics og stories) som faktisk er brukt og oppdatert, ikke bare generert én gang.
Sammenheng plan–kode: at funksjoner i koden kan spores tilbake til krav og stories, og at avvik fra planen er forklart.
Commit-historikk: jevn utvikling over tid fremfor én stor commit før fristen; små, avgrensede commits med beskrivende meldinger.
Arbeidsflyt: bruk av branches, pull requests, issues eller tilsvarende for å organisere arbeidet.
Sporbar KI-bruk: lagrede prompts og KI-økter, og eksempler på at man har presisert krav, avvist, rettet eller forbedret KI-forslag.
Beslutninger: dokumenterte valg av teknologi, arkitektur og løsninger, med begrunnelse.
Samarbeid: at historikken viser at arbeidet er utført av gruppen over tid. Ujevn fordeling i commit-statistikk alene er ikke grunnlag for trekk, siden par- og mobprogrammering er vanlig.
Merknad: Ikke relevant for dette prosjektet – utviklet av én person.
2. Funksjonalitet og omfang (20 %)

Sensor ser etter:

At kjerneflytene i project brief og README fungerer fra start til slutt.
Omfang og kompleksitet i forhold til oppgaven, for eksempel datalagring, flere brukerkontroller, integrasjoner eller ikke-trivielle regler.
Stabilitet: at appen tåler vanlig bruk, feil input og gjentatte handlinger uten å krasje.
At det som er utelatt eller endret fra proposal, er beskrevet og begrunnet.
3. Kvalitetssikring og testing (15 %)

Sensor ser etter:

Automatiserte tester (enhets-, integrasjons- eller ende-til-ende-tester) som kan kjøres etter beskrivelsen i README, og som tester meningsfull logikk.
Dokumenterte manuelle tester eller testplaner der automatiserte tester ikke er hensiktsmessige.
Spor av kodegjennomgang, for eksempel kommentarer i pull requests eller beskrivelser av feil som ble funnet i KI-generert kode og hvordan de ble rettet.
Grunnleggende feilhåndtering, validering av input og bevissthet om sikkerhet, for eksempel at hemmeligheter ikke ligger i koden.
4. Design og brukeropplevelse (10 %)

Kriteriet vurderer om appen er gjennomtenkt utformet for brukerne den er laget for. Design omfatter både visuelt uttrykk og hvor lett appen er å forstå og bruke. Vurderingen tilpasses typen app; et kommandolinjeverktøy vurderes for eksempel ut fra tydelige meldinger og god struktur i utdata.

Sensor ser etter:

Helhetlig og konsistent visuelt uttrykk: farger, typografi, avstand og komponenter.
Tydelig navigasjon og informasjonsstruktur; brukerne forstår hva som kan gjøres og hva som skjer.
Forståelige tilbakemeldinger, feilmeldinger og tomtilstander.
Grunnleggende tilgjengelighet (universell utforming): lesbarhet, kontrast, tastaturnavigasjon, alternativtekst og fornuftige skjemaetiketter.
Tilpasning til relevante skjermstørrelser.
Spor av designarbeid i prosessen, for eksempel skisser, wireframes eller UX-beskrivelser i planleggingsdokumentene.
5. Kode og arkitektur (10 %)

Kriteriet vurderer om koden er forståelig og vedlikeholdbar. Studentene skal ikke ha skrevet koden selv, men de har ansvar for at KI-generert kode utgjør en sammenhengende og ryddig helhet.

Sensor ser etter:

Logisk mappe- og modulstruktur som samsvarer med arkitekturen som er beskrevet.
Lesbar kode med beskrivende navn og fornuftige kommentarer der det trengs.
Lite duplisering, død kode og utkommenterte rester fra tidligere KI-forsøk.
Konsekvent stil, gjerne støttet av linter eller formaterer.
Fornuftig håndtering av konfigurasjon og avhengigheter.
6. README og kjørbarhet (10 %)

README.md er døra inn til prosjektet. Kriteriet vurderer om en person som ikke kjenner prosjektet kan forstå hva appen gjør og få den til å kjøre ved å følge README – uten å spørre utvikleren.

Sensor ser etter:

Kort beskrivelse av hva appen gjør og hvem den er for, gjerne med skjermbilde.
Forutsetninger med versjoner, for eksempel Node.js, Python eller database.
Steg-for-steg installasjon og oppstart med eksakte kommandoer som kan kopieres.
Konfigurasjon: hvilke miljøvariabler som trengs, med en eksempelfil (for eksempel .env.example) uten ekte hemmeligheter.
Testdata eller testbrukere ved behov, og hvordan testene kjøres.
Oversikt over mappestrukturen og lenker til planleggings- og prosessdokumentasjonen.
At README er tilpasset prosjektet og oppdatert, ikke en uendret mal eller generert tekst som ikke stemmer med koden.
7. Ryddighet i repoet (5 %)

Kriteriet vurderer om repoet er organisert slik at andre lett finner frem, og om det bare inneholder filer som hører hjemme der.

Sensor ser etter:

Oversiktlig mappestruktur med tydelig skille mellom kode, dokumentasjon og eventuelle ressurser.
En .gitignore som holder byggeartefakter, avhengigheter (for eksempel node_modules eller venv) og lokale filer ute av repoet.
Ingen hemmeligheter i repoet eller historikken, som API-nøkler, passord eller .env-filer.
Ingen løse testfiler, sikkerhetskopier, gamle versjoner eller tilfeldige filer i rotmappen.
Fornuftige fil- og mappenavn.
Typiske varseltegn

Følgende forhold undersøkes nærmere og omtales i begrunnelsen dersom de påvirker karakteren:

Hele eller nesten hele koden er lagt inn i én eller noen få commits rett før fristen.
Planleggingsdokumentene beskriver en annen app enn den som er levert, eller er tydelig generert i etterkant.
README er en uendret mal, eller kommandoene i README virker ikke.
API-nøkler, passord eller .env-filer er committet.
node_modules, venv, build-mapper eller store binærfiler ligger i repoet.
Testene feiler, eller tester bare trivielle ting.
Store mengder død kode, dupliserte filer eller rester fra forkastede KI-forsøk.
Dokumentasjonen av KI-bruk er generell og kan ikke knyttes til konkrete endringer i repoet.