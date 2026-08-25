import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
Kris Ramboer — Weekschema
Warme zakelijke stijl: leder/tabac, serif titels, mono cijfers
============================================================ */

const DAYNAMES = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const DAYNAMES_SHORT = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"];

const START_WEIGHT = 98.3;
const GOAL_WEIGHT = 90.0;
const TARGET_KCAL = 2000;
const TARGET_PROTEIN = 160;

const INBODY = {
bmi: 29.0,
vetpercentage: 27.2,
spiermassa: 40.3,
basaal: 1915,
visceraal: 12,
middelheup: 0.96,
};

/* ––––– storage helpers ––––– */
async function loadKey(key, fallback, shared = false) {
try {
const res = await window.storage.get(key, shared);
if (!res) return fallback;
return JSON.parse(res.value);
} catch {
return fallback;
}
}
async function saveKey(key, value, shared = false) {
try {
await window.storage.set(key, JSON.stringify(value), shared);
return true;
} catch {
return false;
}
}

/* ––––– Anthropic API call ––––– */
async function callClaude(systemPrompt, userPrompt, maxTokens = 4000) {
const response = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
model: "claude-sonnet-4-6",
max_tokens: maxTokens,
system: systemPrompt,
messages: [{ role: "user", content: userPrompt }],
}),
});

if (!response.ok) {
let detail = "";
try {
const errJson = await response.json();
detail = errJson?.error?.message || JSON.stringify(errJson);
} catch {
detail = await response.text().catch(() => "");
}
throw new Error(`API-fout (${response.status}): ${detail || "onbekende fout"}`);
}

const data = await response.json();

if (data.stop_reason === "max_tokens") {
throw new Error(
"Het antwoord werd afgekapt (te veel tokens nodig). Probeer opnieuw — dit kan gebeuren bij een uitgebreide week."
);
}

const text = (data.content || [])
.filter((b) => b.type === "text")
.map((b) => b.text)
.join("\n");

if (!text.trim()) {
throw new Error("Leeg antwoord ontvangen van het model.");
}

// Strip eventuele markdown-codefences
let clean = text.replace(/`json/gi, "").replace(/`/g, "").trim();

// Als er nog tekst vóór/na de JSON staat: pak het eerste { ... laatste }
const firstBrace = clean.indexOf("{");
const lastBrace = clean.lastIndexOf("}");
if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
clean = clean.slice(firstBrace, lastBrace + 1);
}

try {
return JSON.parse(clean);
} catch (e) {
throw new Error(`Kon het antwoord niet verwerken als JSON: ${e.message}`);
}
}

/* ============================================================
INTAKE VRAGEN DEFINITIE
============================================================ */
const INTAKE_STEPS = [
{
key: "kookt_zelf",
vraag: "Kook je zelf, of eet je vaak iets anders?",
opties: [
"Ja, ik kook zelf de meeste dagen",
"Deels zelf, deels partner/gezin kookt",
"Vaak kant-en-klaar of bezorgd",
"Wisselend, geen vast patroon",
],
},
{
key: "wat_op_tafel",
vraag: "Wat staat er typisch op tafel bij het avondeten?",
opties: [
"Vlees of vis met aardappelen/rijst en groenten",
"Pasta of Italiaans",
"Aziatisch (wok, rijst, noedels)",
"Simpel en licht (salade, soep, brood)",
],
},
{
key: "ontbijt_inhoud",
vraag: "Wat eet je meestal als ontbijt?",
opties: [
"Boterhammen (beleg, kaas, hesp)",
"Yoghurt met muesli of fruit",
"Havermout of porridge",
"Ik sla het ontbijt vaak over",
],
},
{
key: "ontbijt_tijdstip",
vraag: "Rond welk tijdstip ontbijt je meestal?",
opties: ["Voor 07:00", "07:00 – 08:00", "08:00 – 09:00", "Na 09:00 of onregelmatig"],
},
{
key: "tussendoor",
vraag: "Eet je tussendoor iets (voormiddag/namiddag)?",
opties: [
"Fruit of noten",
"Koek, chocolade of iets zoets",
"Yoghurt of eiwitrijk snackje",
"Meestal niets tussendoor",
],
},
{
key: "middag_inhoud",
vraag: "Wat eet je typisch 's middags op het werk?",
opties: [
"Broodjes of boterhammen",
"Salade of bowl",
"Warme maaltijd (bedrijfsrestaurant/traiteur)",
"Vaak overgeslagen of last-minute",
],
},
{
key: "middag_tijdstip",
vraag: "Rond welk tijdstip eet je 's middags?",
opties: ["12:00 – 12:30", "12:30 – 13:30", "13:30 – 14:30", "Wisselend, geen vast uur"],
},
{
key: "business_lunches",
vraag: "Hoeveel business lunches heb je gemiddeld per week?",
opties: ["0 – 1 per week", "2 – 3 per week", "4 – 5 per week", "Bijna elke werkdag"],
},
{
key: "avond_inhoud",
vraag: "En het avondeten — wat komt daar meestal op tafel qua hoeveelheid/stijl?",
opties: [
"Uitgebreid, het hoofdmoment van de dag",
"Gemiddelde portie, gebalanceerd",
"Licht, vooral groenten/eiwit",
"Verschilt sterk van dag tot dag",
],
},
{
key: "avond_tijdstip",
vraag: "Rond welk tijdstip eet je 's avonds?",
opties: ["Voor 18:30", "18:30 – 19:30", "19:30 – 20:30", "Na 20:30 of wisselend"],
},
{
key: "water",
vraag: "Hoeveel water/niet-calorische drank drink je gemiddeld per dag?",
opties: ["Minder dan 1 liter", "1 – 1,5 liter", "1,5 – 2,5 liter", "Meer dan 2,5 liter"],
},
{
key: "alcohol",
vraag: "Hoe zit het met alcohol?",
opties: [
"Zelden tot nooit",
"In het weekend, sociaal",
"Enkele keren per week (o.a. business dinners)",
"Bijna dagelijks een glas",
],
},
{
key: "voorkeuren",
vraag: "Voedingsvoorkeuren of allergieën waar we rekening mee moeten houden?",
opties: [
"Geen bijzondere restricties",
"Weinig/geen varkensvlees",
"Lactose-arm of lactosevrij",
"Geen gluten of glutenarm",
],
},
];

/* ============================================================
INTAKE COMPONENT
============================================================ */
function IntakeFlow({ onComplete }) {
const [stepIndex, setStepIndex] = useState(0);
const [answers, setAnswers] = useState({});
const [customMode, setCustomMode] = useState(false);
const [customText, setCustomText] = useState("");

const step = INTAKE_STEPS[stepIndex];
const isLast = stepIndex === INTAKE_STEPS.length - 1;

const choose = (value) => {
const next = { ...answers, [step.key]: value };
setAnswers(next);
setCustomMode(false);
setCustomText("");
if (isLast) {
onComplete(next);
} else {
setStepIndex((i) => i + 1);
}
};

const submitCustom = () => {
if (!customText.trim()) return;
choose(customText.trim());
};

const goBack = () => {
if (stepIndex === 0) return;
setCustomMode(false);
setCustomText("");
setStepIndex((i) => i - 1);
};

const progress = ((stepIndex + (isLast ? 0 : 0)) / INTAKE_STEPS.length) * 100;

return (
<div style={S.intakeWrap}>
<div style={S.intakeCard}>
<div style={S.progressTrack}>
<div style={{ ...S.progressFill, width: `${((stepIndex) / INTAKE_STEPS.length) * 100}%` }} />
</div>
<div style={S.stepCounter}>
Vraag {stepIndex + 1} / {INTAKE_STEPS.length}
</div>

    <h2 style={S.intakeQuestion}>{step.vraag}</h2>

    {!customMode ? (
      <div style={S.optionsCol}>
        {step.opties.map((opt) => (
          <button key={opt} style={S.optionBtn} onClick={() => choose(opt)}>
            {opt}
          </button>
        ))}
        <button
          style={{ ...S.optionBtn, ...S.optionBtnGhost }}
          onClick={() => setCustomMode(true)}
        >
          Iets anders... (zelf typen)
        </button>
      </div>
    ) : (
      <div style={S.customBox}>
        <textarea
          autoFocus
          style={S.customTextarea}
          placeholder="Typ hier je eigen antwoord..."
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
        />
        <div style={S.customBtnRow}>
          <button style={S.secondaryBtn} onClick={() => setCustomMode(false)}>
            Terug naar opties
          </button>
          <button style={S.primaryBtn} onClick={submitCustom} disabled={!customText.trim()}>
            Bevestigen
          </button>
        </div>
      </div>
    )}

    {stepIndex > 0 && (
      <button style={S.backLink} onClick={goBack}>
        ← Vorige vraag
      </button>
    )}
  </div>
</div>
);
}

/* ============================================================
GENERATING SCREEN
============================================================ */
function GeneratingScreen({ label }) {
return (
<div style={S.intakeWrap}>
<div style={{ ...S.intakeCard, textAlign: "center" }}>
<div style={S.spinner} />
<h2 style={{ ...S.intakeQuestion, marginTop: 24 }}>{label}</h2>
<p style={{ color: PAL.textMuted, fontFamily: FONT.body }}>
Een moment geduld — dit gebeurt op de achtergrond.
</p>
</div>
</div>
);
}

/* ============================================================
BELT / VOORTGANGSRIEM  (signature element)
Horizontale leren riem met gaatjes van start- naar streefgewicht
============================================================ */
function ProgressBelt({ current, start, goal }) {
const holes = 8;
const totalRange = start - goal; // 8.3
const progressed = Math.max(0, Math.min(totalRange, start - current));
const pct = totalRange > 0 ? progressed / totalRange : 0;
const activeHole = Math.round(pct * (holes - 1));

return (
<div style={S.beltWrap}>
<div style={S.beltLabelRow}>
<span style={S.beltLabelLeft}>{start.toFixed(1)} kg</span>
<span style={S.beltLabelRight}>{goal.toFixed(1)} kg</span>
</div>
<div style={S.beltStrap}>
<div style={S.beltStitchTop} />
{Array.from({ length: holes }).map((_, i) => {
const filled = i <= activeHole;
return (
<div
key={i}
style={{
...S.beltHole,
left: `${(i / (holes - 1)) * 100}%`,
background: filled ? PAL.accentDark : PAL.leatherLight,
boxShadow: filled ? `0 0 0 3px ${PAL.accentDark}33` : "none",
}}
/>
);
})}
<div
style={{
...S.beltBuckle,
left: `calc(${(activeHole / (holes - 1)) * 100}% - 13px)`,
}}
>
<div style={S.buckleInner} />
</div>
<div style={S.beltStitchBottom} />
</div>
<div style={S.beltCurrentRow}>
<span style={S.beltCurrentLabel}>Huidig gewicht</span>
<span style={S.beltCurrentValue}>{current.toFixed(1)} kg</span>
</div>
</div>
);
}

/* ============================================================
INBODY PANEL
============================================================ */
function InBodyPanel({ weightLog, onLogWeight }) {
const [showLogInput, setShowLogInput] = useState(false);
const [weightInput, setWeightInput] = useState("");

const latestWeight =
weightLog.length > 0 ? weightLog[weightLog.length - 1].weight : START_WEIGHT;

const submitWeight = () => {
const val = parseFloat(weightInput.replace(",", "."));
if (isNaN(val) || val <= 0) return;
onLogWeight(val);
setWeightInput("");
setShowLogInput(false);
};

return (
<div style={S.panel}>
<h3 style={S.panelTitle}>Traject naar doel</h3>
<ProgressBelt current={latestWeight} start={START_WEIGHT} goal={GOAL_WEIGHT} />

  {!showLogInput ? (
    <button style={S.logWeightBtn} onClick={() => setShowLogInput(true)}>
      + Gewicht van vandaag noteren
    </button>
  ) : (
    <div style={S.logWeightRow}>
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        style={S.logWeightInput}
        placeholder="bv. 96.4"
        value={weightInput}
        onChange={(e) => setWeightInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submitWeight()}
      />
      <span style={S.logWeightUnit}>kg</span>
      <button style={S.primaryBtnSmall} onClick={submitWeight}>
        Opslaan
      </button>
      <button style={S.secondaryBtnSmall} onClick={() => setShowLogInput(false)}>
        Annuleer
      </button>
    </div>
  )}

  {weightLog.length > 0 && (
    <div style={S.weightHistory}>
      <div style={S.weightHistoryTitle}>Recente metingen</div>
      {[...weightLog].slice(-5).reverse().map((entry, i) => (
        <div key={i} style={S.weightHistoryRow}>
          <span style={S.weightHistoryDate}>
            {new Date(entry.date).toLocaleDateString("nl-BE", {
              day: "numeric",
              month: "short",
            })}
          </span>
          <span style={S.weightHistoryVal}>{entry.weight.toFixed(1)} kg</span>
        </div>
      ))}
    </div>
  )}

  <div style={S.divider} />

  <h3 style={S.panelTitle}>InBody-cijfers</h3>
  <div style={S.metricsGrid}>
    <Metric label="BMI" value={INBODY.bmi.toFixed(1)} />
    <Metric label="Vetpercentage" value={`${INBODY.vetpercentage.toFixed(1)}%`} />
    <Metric label="Spiermassa" value={`${INBODY.spiermassa.toFixed(1)} kg`} />
    <Metric label="Basaalmetabolisme" value={`${INBODY.basaal} kcal`} />
    <Metric label="Visceraal vet" value={INBODY.visceraal} />
    <Metric label="Middel-heup" value={INBODY.middelheup.toFixed(2)} />
  </div>

  <div style={S.divider} />

  <h3 style={S.panelTitle}>Streefkader / dag</h3>
  <div style={S.targetRow}>
    <span style={S.targetLabel}>Energie</span>
    <span style={S.targetValue}>{TARGET_KCAL} kcal</span>
  </div>
  <div style={S.targetRow}>
    <span style={S.targetLabel}>Eiwit</span>
    <span style={S.targetValue}>{TARGET_PROTEIN} g</span>
  </div>
</div>
);
}

function Metric({ label, value }) {
return (
<div style={S.metricBox}>
<div style={S.metricValue}>{value}</div>
<div style={S.metricLabel}>{label}</div>
</div>
);
}

/* ============================================================
DAG-KAART
============================================================ */
function DayCard({ dayIndex, dayData, isToday, isOpen, onToggle, onRequestOverride, overrideBusy }) {
const [showOverrideMenu, setShowOverrideMenu] = useState(false);
const [customOverride, setCustomOverride] = useState("");
const [showCustomOverride, setShowCustomOverride] = useState(false);

if (!dayData) return null;

const quickOverrides = ["Zakenlunch", "Reisdag", "Avondevent", "Rustige dag"];

const handleQuick = (label) => {
setShowOverrideMenu(false);
onRequestOverride(dayIndex, label);
};

const handleCustomSubmit = () => {
if (!customOverride.trim()) return;
setShowCustomOverride(false);
setShowOverrideMenu(false);
onRequestOverride(dayIndex, customOverride.trim());
setCustomOverride("");
};

return (
<div style={{ ...S.dayCard, ...(isToday ? S.dayCardToday : {}) }}>
<button style={S.dayCardHeader} onClick={onToggle}>
<div style={S.dayCardHeaderLeft}>
<span style={S.dayIndexBadge}>{DAYNAMES_SHORT[dayIndex]}</span>
<div>
<div style={S.dayName}>
{DAYNAMES[dayIndex]}
{isToday && <span style={S.todayTag}>vandaag</span>}
</div>
<div style={S.daySummaryLine}>
{dayData.totaal_kcal} kcal · {dayData.totaal_eiwit}g eiwit
{dayData.dagtype && dayData.dagtype !== "normaal" && (
<span style={S.dayTypeTag}> · {dayData.dagtype}</span>
)}
</div>
</div>
</div>
<span style={{ ...S.chevron, transform: isOpen ? "rotate(180deg)" : "none" }}>⌄</span>
</button>

  {isOpen && (
    <div style={S.dayCardBody}>
      {dayData.maaltijden.map((m, i) => (
        <div key={i} style={S.mealRow}>
          <div style={S.mealMeta}>
            <span style={S.mealTime}>{m.tijdstip}</span>
            <span style={S.mealType}>{m.type}</span>
          </div>
          <div style={S.mealContent}>
            <div style={S.mealName}>{m.naam}</div>
            {m.details && <div style={S.mealDetails}>{m.details}</div>}
          </div>
          <div style={S.mealMacros}>
            <span>{m.kcal} kcal</span>
            <span style={S.mealProtein}>{m.eiwit}g eiwit</span>
          </div>
        </div>
      ))}

      {dayData.notitie && <div style={S.dayNote}>{dayData.notitie}</div>}

      <div style={S.overrideZone}>
        {!showOverrideMenu ? (
          <button
            style={S.overrideToggleBtn}
            onClick={() => setShowOverrideMenu(true)}
            disabled={overrideBusy}
          >
            {overrideBusy ? "Bezig met herzien..." : "Deze dag wijkt af →"}
          </button>
        ) : (
          <div style={S.overrideMenu}>
            <div style={S.overrideMenuLabel}>Wat is er anders vandaag?</div>
            {!showCustomOverride ? (
              <>
                <div style={S.overrideChipRow}>
                  {quickOverrides.map((q) => (
                    <button key={q} style={S.overrideChip} onClick={() => handleQuick(q)}>
                      {q}
                    </button>
                  ))}
                </div>
                <div style={S.overrideMenuBtnRow}>
                  <button style={S.overrideChipGhost} onClick={() => setShowCustomOverride(true)}>
                    Zelf typen...
                  </button>
                  <button
                    style={S.overrideCancelBtn}
                    onClick={() => setShowOverrideMenu(false)}
                  >
                    Annuleer
                  </button>
                </div>
              </>
            ) : (
              <div style={S.customBox}>
                <textarea
                  autoFocus
                  style={S.customTextarea}
                  placeholder="bv. Etentje met klant om 20u, waarschijnlijk Italiaans"
                  value={customOverride}
                  onChange={(e) => setCustomOverride(e.target.value)}
                />
                <div style={S.customBtnRow}>
                  <button style={S.secondaryBtn} onClick={() => setShowCustomOverride(false)}>
                    Terug
                  </button>
                  <button
                    style={S.primaryBtn}
                    onClick={handleCustomSubmit}
                    disabled={!customOverride.trim()}
                  >
                    Dag herzien
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {dayData.geschiedenis && dayData.geschiedenis.length > 0 && (
        <HistoryPanel history={dayData.geschiedenis} />
      )}
    </div>
  )}
</div>
);
}

function HistoryPanel({ history }) {
const [open, setOpen] = useState(false);
return (
<div style={S.historyWrap}>
<button style={S.historyToggle} onClick={() => setOpen((o) => !o)}>
{open ? "▾" : "▸"} Geschiedenis van aanpassingen ({history.length})
</button>
{open && (
<div style={S.historyList}>
{history.map((h, i) => (
<div key={i} style={S.historyItem}>
<div style={S.historyItemDate}>
{new Date(h.timestamp).toLocaleDateString("nl-BE", {
day: "numeric",
month: "short",
hour: "2-digit",
minute: "2-digit",
})}
</div>
<div style={S.historyItemReason}>Reden: {h.reden}</div>
<div style={S.historyItemSummary}>
Vorig schema: {h.vorig_totaal_kcal} kcal, {h.vorig_totaal_eiwit}g eiwit
</div>
</div>
))}
</div>
)}
</div>
);
}

/* ============================================================
PROMPT BUILDERS
============================================================ */
function buildWeekSystemPrompt() {
return `Je bent een sportdiëtist die een realistisch, gevarieerd Nederlandstalig weekvoedingsschema opstelt voor een 56-jarige Belgische ondernemer.

CONTEXT VAN DE CLIËNT:

- Kris Ramboer, 56 jaar, ondernemer, Belgisch, spreekt Nederlands.
- Huidig gewicht ${START_WEIGHT} kg, streefgewicht onder ${GOAL_WEIGHT} kg.
- InBody-meting: BMI ${INBODY.bmi}, vetpercentage ${INBODY.vetpercentage}%, spiermassa ${INBODY.spiermassa} kg, basaalmetabolisme ${INBODY.basaal} kcal, visceraal vet ${INBODY.visceraal}, middel-heupratio ${INBODY.middelheup}.
- Streefkader: ongeveer ${TARGET_KCAL} kcal/dag en ongeveer ${TARGET_PROTEIN} g eiwit/dag.
- Traint dinsdag en donderdag om 07:30 met een personal trainer, en bouwt geleidelijk op naar een halve marathon (extra aandacht voor koolhydraten/herstel rond trainingsdagen en lange duurlopen).
- Gebruikt momenteel Manjaro (medicatie) en is dit aan het afbouwen onder begeleiding van een arts. Hou in het schema rekening met eiwitbehoud en stabiele bloedsuiker, maar geef NOOIT doseringsadvies over medicatie — verwijs daarvoor expliciet naar zijn arts als dat ter sprake komt.
- Heeft regelmatig business lunches; het schema moet daar realistisch mee omgaan (bv. lichter ontbijt/avondeten op dagen met een uitgebreide lunch).

OPDRACHT:
Genereer een volledig weekschema (7 dagen, maandag t.e.m. zondag) gebaseerd op de intake-antwoorden van de cliënt hieronder. Vertrek vanuit zijn HUIDIGE eetgewoontes (zoals aangegeven in de intake) en stuur GELEIDELIJK bij richting het streefkader — dit is geen crashdieet, geen twee dagen mogen identiek zijn, en het moet praktisch haalbaar zijn binnen een druk ondernemersleven.

Elke dag heeft realistische maaltijden op de tijdstippen die de cliënt aangaf (ontbijt, eventueel tussendoortje(s), middageten, avondeten, en indien relevant een tussendoortje na het sporten op trainingsdagen). Varieer de gerechten stevig door de week heen — geen twee dagen met hetzelfde ontbijt of dezelfde avondmaaltijd. Verwerk minstens 1-2 business lunches realistisch in de week op basis van de intake, met een compenserende lichtere maaltijd elders die dag.

BELANGRIJK — ANTWOORD UITSLUITEND IN GELDIG JSON, GEEN MARKDOWN, GEEN UITLEG ERBUITEN. Structuur:

{
"dagen": [
{
"dagtype": "normaal" | "trainingsdag" | "zakenlunch" | "rustdag",
"totaal_kcal": <getal>,
"totaal_eiwit": <getal>,
"maaltijden": [
{
"tijdstip": "07:30",
"type": "Ontbijt" | "Tussendoor" | "Middageten" | "Avondeten" | "Na training",
"naam": "korte naam van het gerecht",
"details": "korte omschrijving met hoeveelheden",
"kcal": <getal>,
"eiwit": <getal>
}
],
"notitie": "optioneel: korte praktische tip voor die dag, bv. over de training of Manjaro-afbouw indien relevant (zonder doseringsadvies)"
}
]
}

Het array "dagen" moet PRECIES 7 elementen bevatten, in volgorde maandag t.e.m. zondag. Dinsdag en donderdag zijn trainingsdagen (dagtype "trainingsdag") met een tussendoortje na de training rond 08:30-09:00. Gebruik uitsluitend het aangegeven format, geen extra velden.`;
}

function buildWeekUserPrompt(intake) {
const lines = INTAKE_STEPS.map((s) => `- ${s.vraag}\n  Antwoord: ${intake[s.key] || "(niet beantwoord)"}`);
return `INTAKE-ANTWOORDEN VAN KRIS:\n\n${lines.join("\n")}\n\nGenereer nu het volledige weekschema volgens de JSON-structuur uit de systeeminstructie.`;
}

function buildOverrideSystemPrompt() {
return `Je bent een sportdiëtist die één specifieke dag herziet in een bestaand weekvoedingsschema voor Kris Ramboer, 56 jaar, Belgische ondernemer.

Streefkader blijft ongeveer ${TARGET_KCAL} kcal en ongeveer ${TARGET_PROTEIN} g eiwit voor de dag als geheel (tenzij de afwijking dat expliciet onmogelijk maakt, bv. een avondevent — herbalanceer dan de andere maaltijden van diezelfde dag zo goed mogelijk om toch dicht bij het streefkader te blijven).
Hou rekening met zijn Manjaro-afbouw (eiwitbehoud, stabiele bloedsuiker) zonder ooit doseringsadvies te geven — verwijs daarvoor naar zijn arts.
Als het een trainingsdag betreft (dinsdag/donderdag, 07:30 PT), behoud voldoende koolhydraten/eiwit rond de training tenzij de afwijking dat overbodig maakt.

BELANGRIJK — ANTWOORD UITSLUITEND IN GELDIG JSON, GEEN MARKDOWN, GEEN UITLEG ERBUITEN. Structuur (exact dezelfde als het weekschema, voor die ENE dag):

{
"dagtype": "normaal" | "trainingsdag" | "zakenlunch" | "reisdag" | "avondevent" | "rustdag",
"totaal_kcal": <getal>,
"totaal_eiwit": <getal>,
"maaltijden": [
{ "tijdstip": "07:30", "type": "Ontbijt", "naam": "...", "details": "...", "kcal": <getal>, "eiwit": <getal> }
],
"notitie": "korte praktische tip voor deze herziene dag"
}`;
}

function buildOverrideUserPrompt(dayIndex, originalDay, reason) {
return `Oorspronkelijk schema voor ${DAYNAMES[dayIndex]}:\n${JSON.stringify(originalDay, null, 2)}\n\nKris geeft aan: "${reason}"\n\nHerzie UITSLUITEND deze dag (${DAYNAMES[dayIndex]}) op basis van deze afwijking, volgens de JSON-structuur uit de systeeminstructie.`;
}

/* ============================================================
MAIN APP
============================================================ */
export default function App() {
const [loading, setLoading] = useState(true);
const [intake, setIntake] = useState(null);
const [weekPlan, setWeekPlan] = useState(null); // array of 7 day objects
const [weightLog, setWeightLog] = useState([]);
const [generating, setGenerating] = useState(false);
const [genError, setGenError] = useState("");
const [openDay, setOpenDay] = useState(null);
const [overrideBusyDay, setOverrideBusyDay] = useState(null);
const [overrideError, setOverrideError] = useState("");

const todayIndex = (() => {
const jsDay = new Date().getDay(); // 0=zondag
return jsDay === 0 ? 6 : jsDay - 1;
})();

/* — initial load — */
useEffect(() => {
(async () => {
const storedIntake = await loadKey("intake", null);
const storedPlan = await loadKey("weekplan", null);
const storedWeights = await loadKey("weightlog", []);
setIntake(storedIntake);
setWeekPlan(storedPlan);
setWeightLog(storedWeights);
setOpenDay(todayIndex);
setLoading(false);
})();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

/* — intake completed → generate week — */
const handleIntakeComplete = useCallback(async (answers) => {
setIntake(answers);
await saveKey("intake", answers);
setGenerating(true);
setGenError("");
try {
const result = await callClaude(
buildWeekSystemPrompt(),
buildWeekUserPrompt(answers),
8000
);
const dagen = (result.dagen || []).map((d) => ({ ...d, geschiedenis: [] }));
if (dagen.length !== 7) {
throw new Error(`Onverwacht aantal dagen ontvangen (${dagen.length} i.p.v. 7).`);
}
setWeekPlan(dagen);
await saveKey("weekplan", dagen);
setOpenDay(todayIndex);
} catch (e) {
setGenError(
`Het genereren van je weekschema is niet gelukt. ${e?.message || ""}`.trim()
);
} finally {
setGenerating(false);
}
}, [todayIndex]);

const retryGeneration = () => {
if (intake) handleIntakeComplete(intake);
};

/* — day override — */
const handleRequestOverride = useCallback(
async (dayIndex, reason) => {
if (!weekPlan) return;
setOverrideBusyDay(dayIndex);
setOverrideError("");
try {
const originalDay = weekPlan[dayIndex];
const result = await callClaude(
buildOverrideSystemPrompt(),
buildOverrideUserPrompt(dayIndex, originalDay, reason)
);
const historyEntry = {
timestamp: new Date().toISOString(),
reden: reason,
vorig_totaal_kcal: originalDay.totaal_kcal,
vorig_totaal_eiwit: originalDay.totaal_eiwit,
};
const newDay = {
...result,
geschiedenis: [...(originalDay.geschiedenis || []), historyEntry],
};
const newPlan = weekPlan.map((d, i) => (i === dayIndex ? newDay : d));
setWeekPlan(newPlan);
await saveKey("weekplan", newPlan);
} catch (e) {
setOverrideError(
`Herzien van ${DAYNAMES[dayIndex]} is niet gelukt. ${e?.message || ""}`.trim()
);
} finally {
setOverrideBusyDay(null);
}
},
[weekPlan]
);

/* — weight logging — */
const handleLogWeight = useCallback(
async (value) => {
const todayStr = new Date().toISOString().slice(0, 10);
const filtered = weightLog.filter((w) => w.date.slice(0, 10) !== todayStr);
const newLog = [...filtered, { date: new Date().toISOString(), weight: value }].sort(
(a, b) => new Date(a.date) - new Date(b.date)
);
setWeightLog(newLog);
await saveKey("weightlog", newLog);
},
[weightLog]
);

/* — render — */
if (loading) {
return (
<div style={S.appRoot}>
<div style={S.fullscreenCenter}>
<div style={S.spinner} />
</div>
</div>
);
}

if (!intake || !weekPlan) {
if (generating) {
return (
<div style={S.appRoot}>
<GeneratingScreen label="Je weekschema wordt opgesteld..." />
</div>
);
}
if (genError) {
return (
<div style={S.appRoot}>
<div style={S.intakeWrap}>
<div style={{ ...S.intakeCard, textAlign: "center" }}>
<h2 style={S.intakeQuestion}>Het genereren is niet gelukt</h2>
<p style={{ color: PAL.textMuted, fontFamily: FONT.body, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
{genError}
</p>
<button style={S.primaryBtn} onClick={retryGeneration}>
Opnieuw proberen
</button>
</div>
</div>
</div>
);
}
return (
<div style={S.appRoot}>
<IntakeFlow onComplete={handleIntakeComplete} />
</div>
);
}

return (
<div style={S.appRoot}>
<header style={S.appHeader}>
<div style={S.appHeaderInner}>
<div style={S.brandMark}>KR</div>
<div>
<div style={S.brandTitle}>Weekschema</div>
<div style={S.brandSubtitle}>Kris Ramboer · voedingstraject</div>
</div>
</div>
</header>

  <main style={S.mainGrid} className="kr-main-grid">
    <section style={S.leftCol}>
      {overrideError && <div style={S.errorBanner}>{overrideError}</div>}
      {weekPlan.map((dayData, idx) => (
        <DayCard
          key={idx}
          dayIndex={idx}
          dayData={dayData}
          isToday={idx === todayIndex}
          isOpen={openDay === idx}
          onToggle={() => setOpenDay(openDay === idx ? null : idx)}
          onRequestOverride={handleRequestOverride}
          overrideBusy={overrideBusyDay === idx}
        />
      ))}
    </section>

    <aside style={S.rightCol}>
      <InBodyPanel weightLog={weightLog} onLogWeight={handleLogWeight} />
    </aside>
  </main>
</div>
);
}

/* ============================================================
STYLE TOKENS
============================================================ */
const PAL = {
bg: "#F6F1E8",
bgPanel: "#FFFDF9",
leather: "#3A2E24",
leatherLight: "#C7A97E",
leatherMid: "#8B5E34",
accentDark: "#6E4423",
accentGreen: "#3D5A3A",
accentRed: "#A8453A",
text: "#2B231B",
textMuted: "#8A7A66",
border: "#E4D8C3",
cardBorder: "#DCCBAA",
};

const FONT = {
display: "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
body: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
mono: "'JetBrains Mono', 'SF Mono', 'Roboto Mono', Consolas, monospace",
};

const S = {
appRoot: {
minHeight: "100vh",
background: PAL.bg,
fontFamily: FONT.body,
color: PAL.text,
backgroundImage:
"radial-gradient(circle at 15% 8%, rgba(139,94,52,0.06), transparent 45%), radial-gradient(circle at 90% 85%, rgba(139,94,52,0.05), transparent 40%)",
},
fullscreenCenter: {
minHeight: "100vh",
display: "flex",
alignItems: "center",
justifyContent: "center",
},
spinner: {
width: 36,
height: 36,
border: `3px solid ${PAL.border}`,
borderTopColor: PAL.leatherMid,
borderRadius: "50%",
margin: "0 auto",
animation: "spin 0.9s linear infinite",
},

/* header */
appHeader: {
borderBottom: `1px solid ${PAL.border}`,
background: PAL.bgPanel,
position: "sticky",
top: 0,
zIndex: 10,
},
appHeaderInner: {
maxWidth: 1080,
margin: "0 auto",
padding: "14px 20px",
display: "flex",
alignItems: "center",
gap: 14,
},
brandMark: {
width: 40,
height: 40,
borderRadius: 8,
background: `linear-gradient(155deg, ${PAL.leatherMid}, ${PAL.leather})`,
color: "#F6F1E8",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontFamily: FONT.display,
fontWeight: 600,
fontSize: 15,
letterSpacing: 0.5,
flexShrink: 0,
},
brandTitle: {
fontFamily: FONT.display,
fontSize: 20,
fontWeight: 600,
color: PAL.leather,
lineHeight: 1.2,
},
brandSubtitle: {
fontSize: 12.5,
color: PAL.textMuted,
marginTop: 1,
},

/* layout */
mainGrid: {
maxWidth: 1080,
margin: "0 auto",
padding: "20px 16px 60px",
display: "grid",
gridTemplateColumns: "1fr",
gap: 20,
},
leftCol: { display: "flex", flexDirection: "column", gap: 12, minWidth: 0 },
rightCol: { minWidth: 0 },

errorBanner: {
background: "#F6E4E0",
border: `1px solid ${PAL.accentRed}55`,
color: PAL.accentRed,
borderRadius: 10,
padding: "10px 14px",
fontSize: 13.5,
},

/* day card */
dayCard: {
background: PAL.bgPanel,
border: `1px solid ${PAL.cardBorder}`,
borderRadius: 14,
overflow: "hidden",
boxShadow: "0 1px 2px rgba(58,46,36,0.04)",
},
dayCardToday: {
borderColor: PAL.leatherMid,
boxShadow: `0 0 0 1px ${PAL.leatherMid}44, 0 2px 8px rgba(139,94,52,0.12)`,
},
dayCardHeader: {
width: "100%",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
padding: "14px 16px",
background: "transparent",
border: "none",
cursor: "pointer",
textAlign: "left",
fontFamily: FONT.body,
},
dayCardHeaderLeft: { display: "flex", alignItems: "center", gap: 12 },
dayIndexBadge: {
width: 34,
height: 34,
borderRadius: 8,
background: PAL.bg,
border: `1px solid ${PAL.border}`,
display: "flex",
alignItems: "center",
justifyContent: "center",
fontFamily: FONT.mono,
fontSize: 11,
fontWeight: 700,
color: PAL.leatherMid,
letterSpacing: 0.5,
flexShrink: 0,
},
dayName: {
fontFamily: FONT.display,
fontSize: 16.5,
fontWeight: 600,
color: PAL.leather,
display: "flex",
alignItems: "center",
gap: 8,
},
todayTag: {
fontFamily: FONT.body,
fontSize: 10.5,
fontWeight: 600,
textTransform: "uppercase",
letterSpacing: 0.6,
background: PAL.leatherMid,
color: "#fff",
padding: "2px 7px",
borderRadius: 20,
},
daySummaryLine: {
fontFamily: FONT.mono,
fontSize: 12,
color: PAL.textMuted,
marginTop: 2,
},
dayTypeTag: { color: PAL.leatherMid },
chevron: {
fontSize: 20,
color: PAL.textMuted,
transition: "transform 0.2s ease",
flexShrink: 0,
},
dayCardBody: {
padding: "0 16px 16px",
borderTop: `1px solid ${PAL.border}`,
},

mealRow: {
display: "grid",
gridTemplateColumns: "56px 1fr auto",
gap: 10,
padding: "12px 0",
borderBottom: `1px solid ${PAL.border}`,
alignItems: "start",
},
mealMeta: { display: "flex", flexDirection: "column", gap: 2 },
mealTime: { fontFamily: FONT.mono, fontSize: 12, fontWeight: 600, color: PAL.leather },
mealType: { fontSize: 10.5, color: PAL.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
mealContent: { minWidth: 0 },
mealName: { fontSize: 14.5, fontWeight: 600, color: PAL.text },
mealDetails: { fontSize: 12.5, color: PAL.textMuted, marginTop: 2, lineHeight: 1.4 },
mealMacros: {
display: "flex",
flexDirection: "column",
alignItems: "flex-end",
gap: 2,
fontFamily: FONT.mono,
fontSize: 12,
color: PAL.text,
whiteSpace: "nowrap",
},
mealProtein: { color: PAL.leatherMid, fontWeight: 600 },

dayNote: {
marginTop: 10,
fontSize: 12.5,
color: PAL.leatherMid,
background: "#F1E7D5",
border: `1px solid ${PAL.leatherLight}55`,
borderRadius: 8,
padding: "9px 12px",
lineHeight: 1.5,
},

/* override */
overrideZone: { marginTop: 12 },
overrideToggleBtn: {
width: "100%",
padding: "9px 12px",
borderRadius: 8,
border: `1px dashed ${PAL.leatherLight}`,
background: "transparent",
color: PAL.leatherMid,
fontSize: 13,
fontWeight: 600,
cursor: "pointer",
fontFamily: FONT.body,
},
overrideMenu: {
background: PAL.bg,
border: `1px solid ${PAL.border}`,
borderRadius: 10,
padding: 12,
},
overrideMenuLabel: { fontSize: 12.5, fontWeight: 600, color: PAL.leather, marginBottom: 8 },
overrideChipRow: { display: "flex", flexWrap: "wrap", gap: 8 },
overrideChip: {
padding: "7px 12px",
borderRadius: 20,
border: `1px solid ${PAL.leatherMid}`,
background: "#fff",
color: PAL.leatherMid,
fontSize: 12.5,
fontWeight: 600,
cursor: "pointer",
fontFamily: FONT.body,
},
overrideChipGhost: {
padding: "7px 12px",
borderRadius: 20,
border: `1px solid ${PAL.border}`,
background: "transparent",
color: PAL.textMuted,
fontSize: 12.5,
cursor: "pointer",
fontFamily: FONT.body,
},
overrideMenuBtnRow: { display: "flex", justifyContent: "space-between", marginTop: 10 },
overrideCancelBtn: {
border: "none",
background: "transparent",
color: PAL.textMuted,
fontSize: 12.5,
cursor: "pointer",
fontFamily: FONT.body,
},

/* history */
historyWrap: { marginTop: 12 },
historyToggle: {
border: "none",
background: "transparent",
color: PAL.textMuted,
fontSize: 12,
cursor: "pointer",
fontFamily: FONT.body,
padding: 0,
},
historyList: { marginTop: 8, display: "flex", flexDirection: "column", gap: 8 },
historyItem: {
background: PAL.bg,
border: `1px solid ${PAL.border}`,
borderRadius: 8,
padding: "8px 10px",
},
historyItemDate: { fontFamily: FONT.mono, fontSize: 11, color: PAL.textMuted },
historyItemReason: { fontSize: 12.5, color: PAL.text, marginTop: 2, fontWeight: 600 },
historyItemSummary: { fontSize: 11.5, color: PAL.textMuted, marginTop: 1 },

/* right panel */
panel: {
background: PAL.bgPanel,
border: `1px solid ${PAL.cardBorder}`,
borderRadius: 14,
padding: 18,
position: "sticky",
top: 78,
},
panelTitle: {
fontFamily: FONT.display,
fontSize: 16,
fontWeight: 600,
color: PAL.leather,
marginBottom: 12,
},
divider: { height: 1, background: PAL.border, margin: "18px 0" },

metricsGrid: {
display: "grid",
gridTemplateColumns: "1fr 1fr",
gap: 10,
},
metricBox: {
background: PAL.bg,
border: `1px solid ${PAL.border}`,
borderRadius: 10,
padding: "10px 10px",
},
metricValue: { fontFamily: FONT.mono, fontSize: 16, fontWeight: 700, color: PAL.leather },
metricLabel: { fontSize: 10.5, color: PAL.textMuted, marginTop: 2, lineHeight: 1.3 },

targetRow: {
display: "flex",
justifyContent: "space-between",
padding: "7px 0",
borderBottom: `1px solid ${PAL.border}`,
},
targetLabel: { fontSize: 13, color: PAL.textMuted },
targetValue: { fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, color: PAL.leather },

/* belt (signature element) */
beltWrap: { marginBottom: 4 },
beltLabelRow: {
display: "flex",
justifyContent: "space-between",
fontFamily: FONT.mono,
fontSize: 11,
color: PAL.textMuted,
marginBottom: 6,
},
beltLabelLeft: {},
beltLabelRight: { color: PAL.accentGreen, fontWeight: 700 },
beltStrap: {
position: "relative",
height: 34,
background: `linear-gradient(180deg, ${PAL.leatherLight}, ${PAL.leatherMid})`,
borderRadius: 6,
margin: "0 13px",
},
beltStitchTop: {
position: "absolute",
top: 4,
left: 4,
right: 4,
height: 0,
borderTop: `1px dashed rgba(255,255,255,0.4)`,
},
beltStitchBottom: {
position: "absolute",
bottom: 4,
left: 4,
right: 4,
height: 0,
borderTop: `1px dashed rgba(255,255,255,0.4)`,
},
beltHole: {
position: "absolute",
top: "50%",
width: 9,
height: 9,
borderRadius: "50%",
transform: "translate(-50%, -50%)",
background: PAL.leatherLight,
border: `1px solid rgba(58,46,36,0.35)`,
transition: "background 0.3s ease",
},
beltBuckle: {
position: "absolute",
top: "50%",
width: 26,
height: 26,
transform: "translateY(-50%)",
transition: "left 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
},
buckleInner: {
width: "100%",
height: "100%",
borderRadius: 6,
background: PAL.leather,
border: `2px solid #F6F1E8`,
boxShadow: "0 2px 5px rgba(58,46,36,0.4)",
},
beltCurrentRow: {
display: "flex",
justifyContent: "space-between",
alignItems: "baseline",
marginTop: 14,
},
beltCurrentLabel: { fontSize: 12.5, color: PAL.textMuted },
beltCurrentValue: { fontFamily: FONT.mono, fontSize: 20, fontWeight: 700, color: PAL.leather },

logWeightBtn: {
width: "100%",
marginTop: 14,
padding: "10px 12px",
borderRadius: 8,
border: `1px solid ${PAL.leatherMid}`,
background: "transparent",
color: PAL.leatherMid,
fontWeight: 600,
fontSize: 13,
cursor: "pointer",
fontFamily: FONT.body,
},
logWeightRow: { display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap", alignItems: "center" },
logWeightInput: {
flex: "1 1 80px",
minWidth: 70,
padding: "8px 10px",
borderRadius: 8,
border: `1px solid ${PAL.border}`,
fontFamily: FONT.mono,
fontSize: 14,
background: PAL.bg,
color: PAL.text,
},
logWeightUnit: { fontSize: 12.5, color: PAL.textMuted },

weightHistory: { marginTop: 14 },
weightHistoryTitle: { fontSize: 11.5, color: PAL.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
weightHistoryRow: {
display: "flex",
justifyContent: "space-between",
fontSize: 12.5,
padding: "4px 0",
},
weightHistoryDate: { color: PAL.textMuted },
weightHistoryVal: { fontFamily: FONT.mono, fontWeight: 600, color: PAL.leather },

/* intake */
intakeWrap: {
minHeight: "100vh",
display: "flex",
alignItems: "center",
justifyContent: "center",
padding: 20,
},
intakeCard: {
width: "100%",
maxWidth: 480,
background: PAL.bgPanel,
border: `1px solid ${PAL.cardBorder}`,
borderRadius: 18,
padding: "28px 26px",
boxShadow: "0 8px 30px rgba(58,46,36,0.08)",
},
progressTrack: {
height: 5,
background: PAL.border,
borderRadius: 10,
overflow: "hidden",
marginBottom: 10,
},
progressFill: {
height: "100%",
background: `linear-gradient(90deg, ${PAL.leatherLight}, ${PAL.leatherMid})`,
transition: "width 0.4s ease",
},
stepCounter: {
fontFamily: FONT.mono,
fontSize: 11.5,
color: PAL.textMuted,
marginBottom: 18,
letterSpacing: 0.4,
},
intakeQuestion: {
fontFamily: FONT.display,
fontSize: 23,
fontWeight: 600,
color: PAL.leather,
lineHeight: 1.3,
marginBottom: 22,
},
optionsCol: { display: "flex", flexDirection: "column", gap: 10 },
optionBtn: {
textAlign: "left",
padding: "13px 16px",
borderRadius: 10,
border: `1px solid ${PAL.border}`,
background: PAL.bg,
color: PAL.text,
fontSize: 14.5,
cursor: "pointer",
fontFamily: FONT.body,
transition: "border-color 0.15s ease, background 0.15s ease",
},
optionBtnGhost: {
background: "transparent",
color: PAL.leatherMid,
fontWeight: 600,
border: `1px dashed ${PAL.leatherLight}`,
},
backLink: {
marginTop: 20,
border: "none",
background: "transparent",
color: PAL.textMuted,
fontSize: 13,
cursor: "pointer",
fontFamily: FONT.body,
padding: 0,
},

customBox: { display: "flex", flexDirection: "column", gap: 10 },
customTextarea: {
minHeight: 90,
padding: 12,
borderRadius: 10,
border: `1px solid ${PAL.border}`,
background: PAL.bg,
color: PAL.text,
fontFamily: FONT.body,
fontSize: 14,
resize: "vertical",
},
customBtnRow: { display: "flex", justifyContent: "space-between", gap: 10 },

primaryBtn: {
padding: "10px 18px",
borderRadius: 9,
border: "none",
background: PAL.leatherMid,
color: "#fff",
fontWeight: 600,
fontSize: 13.5,
cursor: "pointer",
fontFamily: FONT.body,
},
secondaryBtn: {
padding: "10px 18px",
borderRadius: 9,
border: `1px solid ${PAL.border}`,
background: "transparent",
color: PAL.textMuted,
fontWeight: 600,
fontSize: 13.5,
cursor: "pointer",
fontFamily: FONT.body,
},
primaryBtnSmall: {
padding: "8px 14px",
borderRadius: 8,
border: "none",
background: PAL.leatherMid,
color: "#fff",
fontWeight: 600,
fontSize: 12.5,
cursor: "pointer",
fontFamily: FONT.body,
},
secondaryBtnSmall: {
padding: "8px 12px",
borderRadius: 8,
border: `1px solid ${PAL.border}`,
background: "transparent",
color: PAL.textMuted,
fontWeight: 600,
fontSize: 12.5,
cursor: "pointer",
fontFamily: FONT.body,
},
};

/* keyframes injected once */
if (typeof document !== "undefined" && !document.getElementById("kr-keyframes")) {
const styleTag = document.createElement("style");
styleTag.id = "kr-keyframes";
styleTag.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } } @media (min-width: 860px) { .kr-main-grid { grid-template-columns: 2fr 1fr !important; } }`;
document.head.appendChild(styleTag);
}
