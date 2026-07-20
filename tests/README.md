# Flayost-tester 🧪

Headless Playwright-suiter som verifiserer appen mot en lokal server
(`python3 -m http.server 8899` i repo-rota) og — for RPC-rundturene —
mot **produksjonsdatabasen**.

```bash
tests/run.sh              # alle suitene
tests/run.sh smoke-liga   # én suite
```

## Produksjonsregler (viktig!)

Familien bruker databasen aktivt. Suitene følger derfor to regler:

1. **Skriver aldri til ekte rader.** All skriving skjer via medlemmer/oster
   med navn som starter med `E2E ` (f.eks. «E2E Fam», «E2E Sletteost»).
2. **Rydd etter kjøring** — noen suiter lager E2E-rader på serveren:
   ```sql
   delete from flayost_cheeses where name like 'E2E %';
   delete from flayost_members where name like 'E2E %';
   ```

UI-suitene (`smoke-*` flest) stubber `SESS`/`BOARD`/`rpc` i sida og rører
ikke serveren i det hele tatt.

## Suitene

| Suite | Dekker |
|---|---|
| `e2e-vitser` | Ostevitse-pakka: fellesvits per innlasting, melke-/navnestyrte vitser |
| `e2e-who` | Fersk enhet viser familien fra serveren (flayost_who) |
| `e2e-regioner` | Regionautocomplete, REGIONS_FR-koordinater mot geojson, SVG-stempler, Min side |
| `smoke-logout` | Logg ut-knappen på Min side |
| `smoke-adult` | Rolleendring (barn→voksen) plukkes opp ved synk |
| `smoke-admin` | Sletting nektes for voksne uten admin (ekte RPC) |
| `smoke-imgs` | Wikimedia-fallbackbilder på kort og detaljark |
| `smoke-badges` | Merker: Geitemester/Ostelegende + hemmelige ❓-merker |
| `smoke-hidden` | Skjulte merker: opptjening, usynlighet, teaser, 👅/💨-justering |
| `smoke-liga` | Merkeligaen: rangering, medaljer, egen rad markert |
| `smoke-land` | countryOf-landbokser, landmerker, variantfeltet i «Ny ost» |
| `smoke-vari` | Variant-/avstands-/utholdenhetsmerker |
| `smoke-meta` | Én metalinje på ostekortene, «av …» kun i detaljark |
| `smoke-familie` | Familiegrupper: RPC-rundtur, gruppert innlogging, Familieligaen per capita |
| `smoke-angre` | Angre egen dom/lukt (ekte RPC) og «Smakt en annen utgave?»-knappen |
| `smoke-mening` | Meningsmerker (Snudd!/Berg-og-dal-bane) og negative «tvilsom heder»-merker |
| `smoke-newbadges` | 8 nyeste merker (teksturer, balanse, streak, km, fullt hus) + AVATARS-listen |
| `smoke-badgepop` | Regresjon: merke-toast skal ALDRI komme fra passive synker, kun egne handlinger |
| `smoke-round` | Smakerunde 🥣: admin-gating, auto-tagging av nye oster, ett aktivt om gangen, barn ser kun rundens oster, admin uberørt |

`tools/` inneholder dev-skriptene som høstet Wikimedia-bildene til
`CHEESES_FR` (`fetch-imgs.js`/`fix-imgs.js`) og resultatkartet
(`cheese-imgs.json`) — kjøres bare når datasettet utvides.
