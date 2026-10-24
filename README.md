# G30 — Singleton

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Fride Dons

## Kom i gang (utvikling)

Krever Node.js 22.12 eller nyere.

```bash
npm install
cp .env.example .env
npm run dev
```

Appen kjører på <http://localhost:3000>. Databasen lagres i `data/local.db`, og migreringer kjøres automatisk ved oppstart.

- `npm test` kjører alle tester uten nett, nøkler eller kontoer.
- `npm run typecheck` sjekker typene.

En fullstendig veiledning for sensor (testdata, testinnlogging og ting å prøve) kommer i Story 1.6.
