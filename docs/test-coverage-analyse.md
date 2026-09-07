# Analyse testdekking — PTGcenter

_Opgesteld op basis van alle branches in de repository._

## Samenvatting

**De testdekking is 0%.** Er bestaat geen enkele test, geen testrunner, geen
coverage-tooling en geen CI-workflow — op geen van de vijf branches.

| Branch | Bestanden | Testrunner | Tests | CI | Lint |
|---|---|---|---|---|---|
| `main` | 1 (lege README) | — | — | — | — |
| `claude/add-claude-documentation-OqJSI` | CLAUDE.md + README | — | — | — | — |
| `claude/create-claude-md-IuiiU` | CLAUDE.md + README | — | — | — | — |
| `claude/garden-design-intake-jmx8x2` | 9 (~1.100 LOC) | — | — | — | — |
| `claude/kris-ramboer-weekschema-ot1cla` | 7 (~1.550 LOC) | — | — | — | — |

Er valt dus geen dekkingspercentage te *verbeteren*; testen moeten van nul
worden opgezet. Dit document beschrijft waar dat het meeste oplevert.

## Structureel probleem vooraf: er is geen gedeelde codebase

`main` bevat alleen een README met één karakter. Alle werkende code leeft op
losse, nooit samengevoegde feature-branches. Die branches zijn bovendien geen
varianten van hetzelfde project: het zijn twee onafhankelijke applicaties met
verschillende `package.json`-namen (`ptg-garden-design-intake` versus
`ptgcenter`) en onverenigbare dependency-versies (React 19 + Vite 8 versus
React 18 + Vite 5).

`CLAUDE.md` beschrijft daarnaast een **derde** applicatie — een "nutrition
engine" met een `buildStrat()`-functie en een PTG Score — waarvan de broncode
in geen enkele branch aanwezig is. De documentatie beschrijft dus code die niet
in de repository staat.

Dit is de voorwaarde voor alles wat hieronder volgt: zolang code niet op één
branch samenkomt, kan CI niets bewaken en verdwijnen tests samen met de branch
waarop ze staan. **Beslis eerst welke app(s) de repository huisvest en merge
die naar `main`**; zet daarna pas de testinfrastructuur op.

## Wat er vandaag ontbreekt

- Geen testrunner (geen Vitest, Jest, Playwright).
- Geen coverage-rapportage.
- Geen CI — niets controleert of een branch überhaupt bouwt.
- Geen linter/formatter.
- Beide apps zijn geschreven als één component van 1.000+ regels waarin
  pure logica, netwerkcalls, opslag en JSX door elkaar staan. Er is nauwelijks
  iets *unit*-testbaar zonder eerst te refactoren.

---

## Prioriteit 1 — Het parsen van AI-antwoorden

Beide apps vragen het taalmodel om JSON terug te geven, en beide "repareren"
dat antwoord met string-manipulatie voordat `JSON.parse` erop losgaat. Dit is
de meest foutgevoelige code in het project, is volledig deterministisch, en is
zonder enige refactoring te testen zodra de functie geëxporteerd wordt.

**`callClaude()` — `weekschema/src/App.jsx:45-100`**

```js
let clean = text.replace(/`json/gi, "").replace(/`/g, "").trim();
```

Deze regel verwijdert **elke** backtick uit het antwoord, niet alleen de
markdown-fences. Een JSON-stringwaarde die legitiem een backtick bevat, wordt
stil beschadigd. Verder wordt met `indexOf("{")` / `lastIndexOf("}")` het
grootste accolade-bereik gepakt, wat misgaat zodra er na de JSON nog een
accolade in vrije tekst staat.

Te dekken gevallen:

- Schoon JSON-antwoord (happy path).
- Antwoord in ```` ```json ````-fences.
- Toelichtende tekst vóór en ná de JSON.
- Antwoord met backticks in een stringwaarde → verwacht: intact, faalt nu.
- `stop_reason: "max_tokens"` → verwacht: duidelijke foutmelding.
- HTTP-fout mét JSON-body, én HTTP-fout met platte tekst als body.
- `content: []` of alleen niet-tekst-blokken → verwacht: "Leeg antwoord".

**Equivalente logica in `GardenDesignTool.jsx:302-313`**

```js
const textBlock = data.content.find((b) => b.type === "text");
```

Hier wordt `data.content` gelezen zonder controle. `if (!response.ok)` vangt
alleen HTTP-fouten af; als de proxy een `{ "error": ... }`-payload met status
200 doorgeeft, gooit deze regel een `TypeError` in plaats van de nette
foutmelding die de UI toont. Een test met een foutpayload legt dit direct
bloot.

## Prioriteit 2 — Validatie van gegenereerde data vóór persistentie

**`handleRequestOverride()` — `weekschema/src/App.jsx:787-820`**

De weekgeneratie controleert tenminste nog `dagen.length !== 7`. De
override-flow controleert **niets**:

```js
const result = await callClaude(...);
const newDay = { ...result, geschiedenis: [...] };
const newPlan = weekPlan.map((d, i) => (i === dayIndex ? newDay : d));
await saveKey("weekplan", newPlan);
```

Levert het model geldige JSON op die niet aan het verwachte schema voldoet
(bijvoorbeeld `{}` of `{"maaltijden": null}`), dan wordt een correcte dag
**permanent overschreven** in de opslag. De gebruiker verliest data zonder
foutmelding en zonder weg terug.

Te dekken gevallen: leeg object, ontbrekende `maaltijden`, `maaltijden` geen
array, `kcal` als string in plaats van getal, ongeldige `dagtype`-waarde. Elk
daarvan zou moeten leiden tot een fout — niet tot een overschreven schema.

Ook de weekvalidatie zelf verdient een test: `dagen.length !== 7` wordt pas
gecontroleerd *nadat* `.map()` eroverheen is gegaan, en de vorm van de
individuele maaltijden wordt nergens gecontroleerd.

## Prioriteit 3 — De gewichtslog en datumlogica (bevat een reproduceerbare bug)

**`handleLogWeight()` — `weekschema/src/App.jsx:823-834`**

```js
const todayStr = new Date().toISOString().slice(0, 10);
const filtered = weightLog.filter((w) => w.date.slice(0, 10) !== todayStr);
```

`toISOString()` geeft de datum in **UTC**, terwijl België op UTC+1/+2 zit. Een
meting die om 00:30 lokale tijd wordt ingevoerd, krijgt de UTC-datum van de
*vorige* dag en overschrijft daarmee de meting van gisteren. Tegelijk toont
`InBodyPanel` diezelfde entry met `toLocaleDateString("nl-BE")` — dus in de
*lokale* tijdzone. Dedupliceersleutel en weergegeven datum lopen daardoor
uiteen.

Dit is exact het soort defect dat één test met een vaste klok (`vi.setSystemTime`)
permanent afvangt:

- Twee metingen op dezelfde lokale dag → één entry, laatste waarde wint.
- Meting om 23:00 en om 00:30 lokale tijd → twee aparte dagen.
- Log blijft chronologisch gesorteerd na invoegen van een oudere meting.

**`todayIndex` — `App.jsx:734-737`** — de mapping `getDay()` (0 = zondag) naar
een maandag-eerst index is een klassieke off-by-one; zeven assertions dekken
hem volledig.

**`submitWeight()` — `App.jsx:385-391`** — `parseFloat("96abc")` levert `96`
op, en er is geen bovengrens. Invoer `"96,4"`, `"96abc"`, `"-5"`, `"0"`, `""`
en `"1000"` horen elk een gedefinieerd resultaat te hebben.

**`ProgressBelt` — `App.jsx:328-345`** — deelt door `start - goal`; test het
gedrag bij gewicht boven de startwaarde, onder het doel, en bij
`START === GOAL` (deling door nul).

## Prioriteit 4 — De Express-proxy (`garden-design-intake/server/index.js`)

Dit is de enige servercode in het project en heeft geen enkele test, terwijl
er een API-sleutel achter zit. `supertest` dekt dit bestand vrijwel volledig
in een handvol tests:

- Ontbrekende `ANTHROPIC_API_KEY` → 500 met de verwachte melding.
- Upstream-fout → status en body worden correct doorgegeven.
- `fetch` gooit een netwerkfout → 502, en de sleutel lekt niet in de respons.
- De catch-all-route `/^(?!\/api).*/` serveert `index.html`, maar laat
  `/api/*` met rust — dat negative-lookahead-patroon verdient een expliciete
  test, inclusief een pad als `/apifoo` dat er verdacht dicht tegenaan ligt.

Twee bevindingen die tijdens het schrijven van die tests naar boven komen en
aandacht verdienen, los van de dekking: de proxy stuurt `req.body`
**ongefilterd** door naar Anthropic (het `model`- en `max_tokens`-veld komen
ongevalideerd van de client), en `cors()` staat open voor elke origin. In
combinatie is dat een vrij toegankelijke doorgeefluik naar de eigen
API-sleutel. Een test die vastlegt dat alleen een toegestane payload wordt
doorgestuurd, is meteen ook de vangrail voor die fix.

## Prioriteit 5 — Formulierlogica en promptopbouw

Deze functies zijn puur en goedkoop te testen, mits ze uit het component
worden gehaald:

- **`canProceed()`** (`GardenDesignTool.jsx:178-182`) — stap 1 vereist
  afmetingen, stap 2 vereist stijl én functies. Test per stap, inclusief
  invoer die alleen uit spaties bestaat.
- **`buildContextSummary()`** (`:184-206`) — de fallbackteksten
  ("onbekend", "geen voorkeur opgegeven") bepalen wat het model te zien
  krijgt. Test met een volledig leeg formulier en met een volledig ingevuld
  formulier.
- **`buildWeekUserPrompt()` / `buildOverrideUserPrompt()`**
  (`weekschema/src/App.jsx:691-718`) — controleer dat onbeantwoorde
  intakevragen als "(niet beantwoord)" verschijnen en dat geen enkele vraag
  wegvalt.
- **`safeName`** (`GardenDesignTool.jsx:588`) — de bestandsnaam-sanitisatie
  met accenten, emoji en een lege klantnaam.

## Prioriteit 6 — Fotoverwerking (realistisch productierisico)

`GardenDesignTool.jsx:669` accepteert `accept="image/*"`, maar regel 272-277
geeft het gedetecteerde MIME-type onbewerkt door aan de Anthropic API:

```js
const mediaType = photoData.substring(5, photoData.indexOf(";"));
```

Een iPhone levert doorgaans `image/heic`, dat de API niet accepteert. De
gebruiker krijgt dan de generieke melding "Er ging iets mis" zonder aanwijzing
dat het aan het fotoformaat ligt. Er is evenmin een groottecontrole, terwijl
de server op 15 MB JSON zit en base64 het volume met ~33% opblaast — een
foto van boven de ~11 MB faalt eveneens onverklaard.

Testgevallen: `image/jpeg` en `image/png` (moeten door), `image/heic` en
`image/svg+xml` (moeten een *begrijpelijke* melding geven), en een
data-URL zonder `;base64`-segment, waarbij `indexOf(";")` `-1` teruggeeft en
`substring(5, -1)` stil `"data:"` als media-type oplevert.

## Prioriteit 7 — Twee wizard-flows als integratietest

Pas nadat het bovenstaande gedekt is, lonen React Testing Library-tests op de
volledige flow, met een gemockte fetch:

- **Garden intake**: foto overslaan → afmetingen invullen → stijl en functies
  kiezen → genereren → dossier verschijnt. Plus het foutpad: mislukte call →
  foutmelding → "Opnieuw proberen" doet een nieuwe call.
- **Weekschema-intake**: alle vragen doorlopen, inclusief de "Iets anders..."-
  vrije-tekstoptie en de terugknop. Let daarbij op `IntakeFlow.goBack()`
  (`:242-247`): eerder gegeven antwoorden blijven in state staan maar worden
  bij terugkeer niet als geselecteerd getoond — leg het gewenste gedrag vast
  in een test.

Terzijde, geen testkwestie maar wel dode code: `App.jsx:249` berekent
`stepIndex + (isLast ? 0 : 0)`, waarbij beide takken nul zijn; de variabele
`progress` wordt vervolgens nergens gebruikt.

## Prioriteit 8 — Stille foutafhandeling in de opslaglaag

`loadKey` / `saveKey` (`weekschema/src/App.jsx:26-42`) vangen elke fout op met
een lege `catch` en geven de fallback terug. Een corrupt `weekplan` in de
opslag betekent daardoor dat de gebruiker zonder enige melding terug bij de
intake belandt en zijn schema kwijt is. Tests die dit vastleggen (corrupte
JSON, `window.storage` afwezig, `set` die gooit) maken zichtbaar dat hier een
gebruikersmelding hoort.

---

## Voorgestelde opzet

Beide apps draaien op Vite, dus Vitest is de logische keuze — één
configuratie, geen aparte transformatieketen.

```bash
npm i -D vitest @vitest/coverage-v8 jsdom \
         @testing-library/react @testing-library/user-event supertest
```

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

Om iets van dit alles unit-testbaar te maken, is één refactorstap nodig: haal
de pure logica uit de grote componenten naar losse modules, bijvoorbeeld

```
src/lib/parseModelResponse.js   ← prioriteit 1
src/lib/validateWeekPlan.js     ← prioriteit 2
src/lib/weightLog.js            ← prioriteit 3
src/lib/prompts.js              ← prioriteit 5
src/lib/storage.js              ← prioriteit 8
```

Die verplaatsing verandert geen gedrag, maar brengt het overgrote deel van de
risicovolle logica binnen bereik van snelle tests zonder DOM.

Voeg tot slot een GitHub Actions-workflow toe die `npm ci`, `npm run build` en
`npm test` draait op elke push en pull request. Zolang code op ongemergede
branches blijft staan, bewaakt CI namelijk niets.

## Realistische streefwaarden

Een dekkingspercentage over het geheel zegt weinig zolang beide apps
grotendeels uit opmaak-JSX bestaan. Zinvoller is dekking per laag:

| Laag | Streefwaarde | Verantwoording |
|---|---|---|
| `src/lib/**` (pure logica) | 90%+ | Deterministisch, geen excuus om het niet te dekken |
| `server/**` | 80%+ | Klein bestand, API-sleutel erachter |
| Wizard-flows (integratie) | happy path + foutpad per app | Regressievangnet, geen regeldekking |
| Opmaakcomponenten | geen streefwaarde | Inline stijlen; tests hierop leveren weinig op |

## Aanbevolen volgorde

1. Beslis welke applicatie(s) de repository huisvest en merge naar `main`.
2. Zet Vitest, coverage en een CI-workflow op.
3. Haal de pure logica uit de componenten (`src/lib/`) — gedragsneutraal.
4. Dek prioriteit 1 t/m 3: parsing, validatie vóór opslag, datumlogica.
   Hier zitten de bugs die vandaag data kunnen vernietigen.
5. Dek de server (prioriteit 4) en fix daarbij de open proxy.
6. Vul aan met prioriteit 5 t/m 8 en de twee integratieflows.
