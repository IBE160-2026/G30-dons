# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G30 – G30-dons |
| **Product brief** | `.docs/planning-artifacts/briefs/brief-MasterPlan-2026-09-25/brief.md` (commit `19b43b0`). `addendum.md` i samme mappe er også lest. |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Én tydelig primærbruker, «the reluctant organizer», med et konkret eksempel: en forlover som planlegger både utdrikningslag (15 gjester) og bryllup (80 gjester) med fem hjelpere. Løftet «every task has someone responsible for it» er skarpt og lett å designe rundt.
2. Ærlig differensiering. Dere sier selv at enkeltdelene finnes fra før, at det ikke finnes noen teknisk vollgrav, og at erfaringsbanken først gir verdi etter mange evaluerte arrangementer. Konkurrentanalysen i addendumet er grundig.
3. Gjennomtenkt KI-bruk. Malen fungerer som reserve hvis KI-en feiler, arrangøren kan overstyre alt, og påminnelsene skal tydelig være KI-skrevet og aldri manipulerende. Det gir også godt stoff til refleksjonsrapporten.

**De viktigste endringene:**

1. **For mange «must work»-punkter for et soloprosjekt.** V1 har ni punkter, blant annet tre ulike KI-funksjoner (planutkast, påminnelser og evalueringssammendrag), e-postutsending, innlogging for to roller, flere samtidige arrangementer, erfaringsbank med anonymisering og kalendereksport. Velg kjerneløkken plan → oppfølging og flytt resten til trinn 2.
2. **Suksesskriteriene måler hjelpernes atferd, ikke appen.** «80 % av oppgavene får ja/nei innen 3 dager» avhenger av vennene som tester, ikke av koden. Behold dem gjerne som evaluering, men legg til funksjonelle kriterier som kan bli tester, for eksempel «en hjelper kan åpne en oppgavelenke uten innlogging, svare nei med en melding, og arrangøren ser svaret i oversikten».
3. **Planlegg kjøring uten egne nøkler.** Både språkmodell og e-post krever nøkler eller kontoer. Beskriv en testmodus der KI-svar og e-post blir mocket (for eksempel at e-post skrives til logg eller en lokal testinnboks), slik at sensor kan kjøre appen etter README.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Middels**

**Sammenlignbart med:** 6) To-do-liste med smarte etiketter (enkel) i kjernen, men utvidet med flere roller, deling via lenke, e-post og flere KI-funksjoner. Det løfter prosjektet til nivået for 2) AI CV- og søknadsassistent (middels). Med alle ni punktene i v1 nærmer det seg vanskelig for én person.

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | middels | Oppgavestatus (bekreftet, avslått, forfalt, snart forfall), frister og påminnelsestidspunkter må stemme. Reglene er forståelige og kan testes. |
| Datamodell – antall entiteter og relasjoner mellom dem | middels | Arrangør, arrangement, mal, oppgave, hjelper, svar, påminnelse, evaluering og erfaringsbank. Hjelpere som deles mellom arrangementer gir flere relasjoner. |
| Brukere, roller og innlogging | middels | Arrangør med innlogging, hjelpere via lenke uten innlogging og hjelpere med valgfri innlogging. Lenketilgang må sikres slik at én hjelper ikke ser andres oppgaver. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | høy | Tre KI-funksjoner. Planutkastet må gi strukturert output (oppgaver med frister) som kan lagres, og det er det mest krevende. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | middels | Språkmodell-API, e-postutsending og kalendereksport (.ics). E-post krever tidsstyrt utsending. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | lav | Flere brukere svarer på oppgaver, men det kreves ikke sanntid. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | lav | Bare .ics-eksport, som er enkelt. |
| Sikkerhet og personvern | middels | Navn og e-post til venner, og evalueringer som kan inneholde konflikter. Anonymisering til erfaringsbanken er krevende å gjøre pålitelig. |

**Hva vanskelighetsgraden betyr for dere:**

- _Middels:_ Et godt balansert valg. Pass på at kjerneflyten blir ferdig og stabil før dere legger til mer. For dere betyr det mal/KI-plan → tildeling via lenke → ja/nei → oversikt, før påminnelser og evaluering.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | risiko | Ni must-punkter alene på omtrent to måneder er stramt, særlig når PRD og arkitektur ennå ikke er laget. Med kjerneløkken som v1 er det realistisk. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | OK | Briefen og addendumet er konkrete nok til en god PRD. Pass på at antallet stories ikke vokser med alle ni punktene. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En vanlig webapp med database, innlogging og et LLM-API passer godt. Planlagt e-post krever en jobbplanlegger, som bør holdes enkel. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | OK | Dere kjenner domenet og kan vurdere om en plan eller påminnelse er fornuftig. KI-genererte planer er vanskelige å teste automatisk, men statuslogikken kan testes. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | risiko | Statusregler, lenketilgang og påminnelsestidspunkter kan testes godt, men de er ikke formulert i briefen. Suksesskriteriene i dag er atferdsmål. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | risiko | Det krever LLM-nøkkel og e-posttjeneste. Malreserven er et godt utgangspunkt. Gjør den til en dokumentert testmodus og legg til en lokal e-postløsning. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | risiko | Språkmodellen koster litt per kall. Det er bra at SMS er utelatt av kostnadshensyn. Beskriv tilsvarende plan for LLM og e-post. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart med justert omfang.** Se forslagene under.

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. **V1 (must):** innlogging for arrangør, arrangement fra mal med KI-utkast og malreserve, redigering, tildeling via lenke med ja/nei og melding, oversikt over alle arrangementer, og én type KI-påminnelse på e-post (med testmodus).
2. **Trinn 2 (hvis tid):** evaluering med KI-sammendrag, erfaringsbank, innlogging for hjelpere og kalendereksport. Flytt dem fra «Must work» til «If there's time» i briefen.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Tydelig: en planleggingsplattform for ikke-planleggere, med tre konkrete grep (KI-plan, ja/nei via lenke, KI-påminnelser). |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Konkret og basert på egen erfaring: oppgaver forsvinner i gruppechatter, og ingen følger opp. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | OK | De fire stegene beskriver hva arrangør og hjelpere opplever, ikke teknologi. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Svært ærlig, inkludert forbeholdet om erfaringsbanken. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | OK | Arrangøren er godt beskrevet. Hjelperne er tydelige som sekundærbrukere med lav terskel. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Juster | Produktkriteriene er atferdsmål fra en testgruppe på 2–3 venner. Legg til funksjonelle kriterier som kan bli testtilfeller. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | Juster | Grensene er tydelige, og «Not in version 1» er god. «Must work» er derimot for omfattende for én person. Flytt punkt 7–9 til «If there's time». |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Fire tydelige trinn som ikke blander seg inn i v1. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | OK | BMAD er satt opp, og briefen med addendum og `.memlog.md` gir et godt spor. Fortsett med PRD og arkitektur, og commit jevnlig. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | Juster | Kjerneflyten er tydelig, og innholdet er mer enn nok. Reduser must-listen, slik at kjernen blir stabil. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | Juster | Skriv statusregler og lenketilgang som testbare krav. Lag noen faste testarrangementer med forventet oversikt. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | OK | Klar bruker og flyt. Hjelpersiden via lenke må fungere godt på mobil, siden lenken deles i chat-apper. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | OK | Ingen teknologi er valgt ennå, og det er riktig i briefen. Hold arkitekturen til én webapp med én database. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg testmodus for LLM og e-post, `.env.example` og en testbruker med ferdig arrangement. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | OK | Planleggingen ligger ryddig i `.docs/`. Husk at API-nøkler og e-postoppsett aldri skal committes. |

## 3. Neste steg for gruppen

1. Del «Must work» i v1 og trinn 2 som foreslått over, og oppdater briefen.
2. Legg til 5–8 funksjonelle suksesskriterier som kan testes, for eksempel for lenketilgang, ja/nei-svar, forfalte oppgaver og malreserven når KI feiler.
3. Lag PRD-en med en egen seksjon om testmodus: hvordan appen kjører uten LLM-nøkkel og uten ekte e-postutsending.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
