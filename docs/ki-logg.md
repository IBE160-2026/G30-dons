# KI-logg

Her noteres hvert KI-forslag som ble rettet, avvist eller presisert, med lenke til commiten der det skjedde.

| Dato | Forslag | Hva som ble gjort | Commit |
| --- | --- | --- | --- |
| 2026-10-25 | Ta inn sensorveiledningen som kvalitetsgrunnlag etter story 1.6, og opprette `CLAUDE.md` med kvalitetskrav og Definition of Done. | Sensorveiledningen ble lagt i `docs/sensorveiledning.md`. `CLAUDE.md` ble opprettet med import av sensorveiledningen, kvalitetskrav og Definition of Done. Arbeidsflyten ble presisert med testing før implementasjon, én branch og pull request per story, denne KI-loggen og linter før commit. | [7073324](https://github.com/IBE160-2026/G30-dons/commit/7073324), [7c13af2](https://github.com/IBE160-2026/G30-dons/commit/7c13af2) |
| 2026-10-25 | Sette opp ESLint med typescript-eslint som linter. | Avvist. typescript-eslint 8.72 krever TypeScript under 6.1 og trenger kompilator-API-et, mens TypeScript 7 bare eksporterer versjonsnummeret. Å nedgradere TypeScript eller omdirigere modul-oppløsningen ble vurdert og valgt bort. Biome ble valgt som linter og formaterer i stedet, siden den ikke er avhengig av TypeScript-kompilatoren. Kjøres med `npm run lint`. | [34fd38c](https://github.com/IBE160-2026/G30-dons/commit/34fd38c) |
