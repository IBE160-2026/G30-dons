# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G30 – G30-dons |
| **PRD vurdert** | `.docs/planning-artifacts/prds/prd-MasterPlan-2026-10-19/prd.md` (status `final`, sist endret 2026-11-10, commit b7995b6). `addendum.md` i samme mappe er også lest. |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en sterk PRD med en tydelig tese («every task has someone responsible for it»), 33 FR-er med testbare konsekvenser og en ærlig prioritering med kuttrekkefølge. Risikoen ligger i detaljene som test og kode skal bygge på: KI-steget har ingen grenser for størrelse og frekvens, påminnelsesreglene mangler noen kantfall, og noen krav har ingen konsekvenser. Endringsnotater og stale tekst fra UX-runden gjør dokumentet også lengre og mindre selvstendig enn det trenger å være.

## 2. Dette fungerer godt

1. **Definisjonene kan gjøres om til tester.** Glossaret i §4 definerer *Urgent*, *Needs a helper* og *On track* nøyaktig, med telling i Europe/Oslo. FR-21 og seed-tabellen i FR-25 gir faste forventede tall. Dette var hovedpunktet i briefen-tilbakemeldingen.
2. **KI-kontroll og kjørbarhet er bygd inn i kravene.** FR-6 definerer hva et ugyldig KI-svar er («no tasks, or a task without a title … a deadline after the event date») og faller tilbake til malens plan. FR-23, FR-24 og FR-26 gir mock-KI, testinnboks og «Simulate AI failure». Examiner er behandlet som en reell bruker (UJ-4).
3. **Beslutningene er synlige.** §8 har en nummerert kuttliste (FR-32 først, FR-14 sist) og begrunner flyttingen av FR-14. Hosting (NFR-8) er markert som første kutt. §1 sier åpent: «It has no technical moat».

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | sterk | Prioritet per FR, kuttrekkefølge og begrunnede endringer. Åpne spørsmål er reelle. |
| Substans | sterk | Ingen pynte-personas. NFR-ene har tall (360 px, 128 bit, $5, 30 s). |
| Strategisk sammenheng | god | Tydelig tese og samlet kjerneløkke. Suksessmålene har ingen kobling til FR-er, og SM-5 kan ikke måles. |
| Testbarhet | god | De fleste FR-er har konsekvenser. FR-9, FR-16 og FR-4 har ingen eller trivielle, og KI- og påminnelsesreglene har hull. |
| Scope og avgrensning | god | Eksplisitt Must/Should, «Out of scope» og trinn 2. Men 26 av 33 FR-er er Must for ett soloprosjekt. |
| Brukbarhet for neste fase | god | IDer 1–33 er unike og krysshenvisningene stemmer. Stale tekst og endringsnotater ligger inne i kravene. |
| Formtilpasning | sterk | Fire UJ med navngitte hovedpersoner, glossar og kapittel for testmodus passer et produkt med to roller. |

## 4. Viktigste forbedringer

### 4.1 KI-steget mangler grenser for størrelse og frekvens
- **Alvorlighet:** høy
- **Hvor:** §5.3 FR-5 («a list of tasks, each with a title and a deadline») og NFR-4 («spend limit of at most $5»)
- **Problem og hvorfor det betyr noe:** Kostnadstaket står som en kontoinnstilling hos leverandøren, ikke som et krav appen kan testes mot. En plan med 200 oppgaver er gyldig etter FR-6. Ingenting hindrer gjentatte kall. Feltene «what needs to be done» og «other information» er fri tekst som går til modellen.
- **Forslag:** Legg til konsekvenser i FR-5 og FR-6: «En plan har 8–40 oppgaver, og hver tittel er 1–120 tegn; ellers er den ugyldig (FR-6).» «En organizer kan utløse høyst 10 KI-kall per døgn; kall nr. 11 bruker malens standardplan og viser en melding.» «Fritekstfeltene sendes som data, ikke som instruksjoner.» Si også hvor mange oppgaver standardplanen har for hver mal, slik at fixture-tabellen i FR-25 kan referere til tallet.

### 4.2 Påminnelsene (FR-17/18) har ubesvarte kantfall
- **Alvorlighet:** høy
- **Hvor:** §5.6 FR-17 («checks for due reminders at least once a day», «never sends the same reminder twice»)
- **Problem og hvorfor det betyr noe:** Påminnelsen er kjernen i løftet og er «never cut». Likevel står det ikke når sjekken kjører, hva som skjer hvis e-posten ikke kan sendes, eller hva som gjelder for et arrangement som er passert. «Aldri to ganger» kan komme i konflikt med «prøv igjen». Uten dette må utvikleren gjette, og testene blir tilfeldige.
- **Forslag:** «Sjekken kjører kl. 08:00 norsk tid hver dag.» «Feiler utsendingen, prøves den ved neste sjekk, høyst 3 ganger; deretter vises oppgaven som "påminnelse ikke sendt" for arrangøren. En påminnelse som er sendt, sendes aldri på nytt.» «En oppgave akseptert nøyaktig 3 dager før fristen får påminnelse ved neste sjekk.» «Arrangementer med passert dato får ingen påminnelser.»

### 4.3 Noen FR-er har ingen eller trivielle konsekvenser
- **Alvorlighet:** medium
- **Hvor:** FR-9 (ingen konsekvenser), FR-16 («mark any task Done herself»), FR-4 («each event has its own tab»)
- **Problem og hvorfor det betyr noe:** Disse blir stories uten akseptansekriterier. FR-9 må dessuten lagre tidspunktet for tildelingen, siden 7-dagersregelen i FR-21 teller fra det.
- **Forslag:** FR-9: «Tildeling til en e-post som ikke er helper i arrangementet avvises.» «Oppgaven blir Open, og tidspunktet for tildelingen lagres (brukes i FR-21).» FR-16: «Done på en Unassigned- eller Open-oppgave er tillatt.» «Oppgaven forsvinner fra Needs you now.» «En ikke-sendt påminnelse for oppgaven sendes ikke (FR-17).»

### 4.4 Stale tekst og endringsnotater inne i kravene
- **Alvorlighet:** medium
- **Hvor:** FR-1 («Helper pages ("Kari has invited you…")») mot UJ-2 steg 1 («Changed from "Kari has invited you…"»). Også «Changed from … on 2026-11-10» i UJ-2, UJ-3 og FR-20, og «Story 5.1» i §0, FR-20 og §8.
- **Problem og hvorfor det betyr noe:** FR-1 beskriver fortsatt den gamle helper-overskriften. Epics-steget og testene kan hente den. Endringsnotatene og henvisningene til en story gjør hver seksjon avhengig av historikk for å leses riktig.
- **Forslag:** Rett FR-1 til den nye overskriften, eller fjern punktet (det hører egentlig til §5.5). Flytt «Changed from …» og «Moved up from 5th place» til en kort endringslogg sist i PRD-en. La PRD-en beskrive *hva* designdelen skal levere uten å nevne Story 5.1.

### 4.5 Suksessmålene er ikke koblet til kravene og er delvis umulige å måle
- **Alvorlighet:** medium
- **Hvor:** §9, SM-2 («at least 80% of tasks get a yes or no within 3 days») og SM-5 («helpers find the reminders helpful, not annoying»)
- **Problem og hvorfor det betyr noe:** Med 2–3 testvenner blir 80 % et tilfeldig tall på kanskje 15 oppgaver. SM-5 har ingen målemetode. Ingen SM sier hvilke FR-er den validerer, så sporbarheten brytes mellom §9 og tabellen i FR-28.
- **Forslag:** «SM-2 … Validerer FR-13, FR-21. Rapporteres som antall (for eksempel 12 av 15), ikke prosent.» «SM-5: etter testen svarer hver hjelper på to spørsmål: "Var påminnelsen til hjelp?" og "Var den irriterende?". Mål: ingen svarer ja på det siste.»

## 5. Mekaniske funn

- FR-1 til FR-33 er komplette og unike, men står ikke i rekkefølge (FR-29/32 i §5.2, FR-30 i §5.4, FR-31 i §5.5, FR-33 i §6). Det er greit, så lenge stories følger prioriteringen i §8.
- Glossar-avvik: FR-3 bruker feltet «what needs to be done», som ikke finnes i definisjonen av *Event*. «Answer», «reply» og «New reply» brukes litt om hverandre.
- SM-1–SM-5 og CM-1–CM-3 mangler krysshenvisninger til FR-er.
- Én inline `[ASSUMPTION]` (NFR-6) og ingen samlet liste. Det holder så lenge den står i §10 punkt 3.
- §10 punkt 1 er markert som løst og punkt 2 er en prosessnotis. Bare punkt 3 og 4 er åpne spørsmål.
- FR-33 nevner «SQLite» og FR-27 `npm test`. Docker er et leveransekrav og kan stå. SQLite hører til i arkitekturdokumentet.

## 6. Før dere går videre

**Må avklares nå** (små tillegg i PRD-en): punkt 4.1 og 4.2, rettelsen av FR-1, og hvilke felt som inngår i *Event* (FR-3 mot glossaret). Dere har kort tid til innleveringen 14. november, så gjør disse først. Resten kan gjøres etterpå.

**Kan vente:** 4.3 og 4.5, rydding av §10, og om 30 sekunder (NFR-6) er riktig tidsgrense. Hosting og hvordan API-nøkler leveres (§10 punkt 4) er allerede håndtert med kuttregel og miljøvariabler.

**Oppfølging av briefen-tilbakemeldingen: ja.** Must-listen er redusert (evaluering, erfaringsbank, helper-innlogging og kalendereksport er flyttet til trinn 2, og påminnelsene har fast tekst). Funksjonelle kriterier og testbare FR-er finnes, og testmodus har fått eget kapittel (§6).

## 7. Refleksjonsspørsmål

1. Dere valgte fast tekst i påminnelsene (FR-18) i stedet for KI-skrevne. Hva foreslo KI-en, hva endret dere, og hvilket argument avgjorde?
2. FR-6 sjekker at en KI-plan er *gyldig*, men ikke om den er *bra*. Hvordan vil dere vurdere kvaliteten på planene i vennetesten, og hva gjør dere hvis KI-en gir en gyldig, men dårlig plan?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
