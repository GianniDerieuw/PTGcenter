import React, { useState, useRef } from "react";
import { ChevronRight, ChevronLeft, Leaf, Sparkles, FileText, Lightbulb, Layers, Euro, CalendarClock, Download, Loader2, Image as ImageIcon, X, Check } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType } from "docx";

// ---------- Design tokens ----------
// Deep evergreen / warm ivory / terracotta / moss / brass
const C = {
  ink: "#1F2A22",
  inkSoft: "#3A4A3B",
  ivory: "#F6F1E7",
  ivoryDeep: "#EFE6D4",
  terracotta: "#B5602F",
  moss: "#5C6B4F",
  brass: "#A8895A",
  line: "rgba(31,42,34,0.14)",
};

const STYLES = ["Modern", "Strak", "Landelijk", "Mediterraan", "Ibiza", "Scandinavisch", "Japans", "Luxe resort", "Minimalistisch", "Natuurlijk"];
const FUNCTIES = ["Groter terras", "Zwembad", "Jacuzzi", "Zwemvijver", "Buitenkeuken", "BBQ", "Lounge", "Pergola/overkapping", "Vuurplaats", "Speelruimte", "Petanquebaan", "Poolhouse", "Wellness/sauna", "Tuinkantoor", "Moestuin", "Waterpartij/vijver"];
const MATERIALEN = ["Keramische tegels", "Natuursteen", "Belgische blauwe steen", "Hout", "Composiet", "Beton", "Cortenstaal", "Grind/kiezel", "Klinkers", "Geborsteld beton"];
const BEPLANTING = ["Olijfbomen", "Palmbomen", "Siergrassen", "Hortensia's", "Lavendel", "Bamboe", "Buxus", "Wolkenbomen", "Bloeiende borders", "Wintergroen"];
const ONDERHOUD = ["Laag", "Gemiddeld", "Hoog"];
const UPSELLS = ["Robotmaaier", "Automatische beregening", "Regenwaterrecuperatie", "Zonnepanelen poolhouse", "Laadpaal", "Sauna", "Jacuzzi", "Vuurtafel", "Buitenspeakers", "Smart garden verlichting", "Camerabewaking", "Tuinberging"];

const STEPS = [
  { key: "foto", label: "Huidige tuin", icon: ImageIcon },
  { key: "basis", label: "Basisgegevens", icon: Leaf },
  { key: "stijl", label: "Stijl & functies", icon: Sparkles },
  { key: "materiaal", label: "Materiaal & groen", icon: Layers },
  { key: "budget", label: "Budget & onderhoud", icon: Euro },
  { key: "resultaat", label: "Ontwerpdossier", icon: FileText },
];

function Toggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? C.ink : C.line}`,
        background: active ? C.ink : "transparent",
        color: active ? C.ivory : C.inkSoft,
        fontSize: 13.5,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.brass, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        background: "#FFFDF9",
        color: C.ink,
        fontFamily: "'Inter', sans-serif",
        fontSize: 14.5,
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        background: "#FFFDF9",
        color: C.ink,
        fontFamily: "'Inter', sans-serif",
        fontSize: 14.5,
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
      }}
    />
  );
}

function MultiToggleGroup({ options, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => (
        <Toggle key={opt} active={selected.includes(opt)} onClick={() => onToggle(opt)}>
          {selected.includes(opt) ? "✓ " : ""}{opt}
        </Toggle>
      ))}
    </div>
  );
}

// Root/branch divider — organic signature motif
function RootDivider() {
  return (
    <svg width="100%" height="28" viewBox="0 0 400 28" preserveAspectRatio="none" style={{ display: "block", margin: "18px 0" }}>
      <path d="M0 14 Q 60 4, 120 14 T 240 14 Q 300 22, 400 10" stroke={C.line} strokeWidth="1.5" fill="none" />
      <circle cx="120" cy="14" r="2.5" fill={C.brass} />
      <circle cx="280" cy="15" r="2.5" fill={C.moss} />
    </svg>
  );
}

export default function GardenDesignTool() {
  const [step, setStep] = useState(0);
  const [photoData, setPhotoData] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const fileRef = useRef(null);

  const [afmetingen, setAfmetingen] = useState("");
  const [adres, setAdres] = useState("");
  const [klantnaam, setKlantnaam] = useState("");
  const [woningType, setWoningType] = useState("");

  const [stijl, setStijl] = useState([]);
  const [functies, setFuncties] = useState([]);

  const [materialen, setMaterialen] = useState([]);
  const [beplanting, setBeplanting] = useState([]);

  const [budget, setBudget] = useState("");
  const [onderhoud, setOnderhoud] = useState("Gemiddeld");
  const [extraWensen, setExtraWensen] = useState("");
  const [upsells, setUpsells] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const toggle = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPhotoData(reader.result);
    reader.readAsDataURL(file);
  };

  const canProceed = () => {
    if (step === 1) return afmetingen.trim().length > 0;
    if (step === 2) return stijl.length > 0 && functies.length > 0;
    return true;
  };

  const buildContextSummary = () => `
KLANTGEGEVENS
- Klant: ${klantnaam || "onbekend"}
- Adres/locatie tuin: ${adres || "onbekend"}
- Type woning: ${woningType || "onbekend"}
- Afmetingen tuin (schatting): ${afmetingen}

STIJL & FUNCTIES
- Gewenste stijl: ${stijl.join(", ") || "geen voorkeur opgegeven"}
- Gewenste functies: ${functies.join(", ") || "geen opgegeven"}

MATERIAAL & BEPLANTING
- Gewenste materialen: ${materialen.join(", ") || "geen voorkeur opgegeven"}
- Gewenste beplanting: ${beplanting.join(", ") || "geen voorkeur opgegeven"}

BUDGET & ONDERHOUD
- Budget: ${budget || "niet opgegeven"}
- Gewenst onderhoudsniveau: ${onderhoud}
- Interesse in upsells: ${upsells.join(", ") || "geen aangeduid"}

EXTRA WENSEN
${extraWensen || "geen"}
`.trim();

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    const context = buildContextSummary();

    const systemPrompt = `Je bent een wereldklasse landschapsarchitect, tuinarchitect en commercieel adviseur met 30+ jaar ervaring in exclusieve residentiële tuinen in België. Je werkt voor een tuinaannemersbedrijf en stelt een compleet, verkoopklaar ontwerpdossier op voor een klant, op basis van de ingevulde intake. Schrijf ALLES in het Nederlands (Vlaams, professioneel maar toegankelijk).

Je antwoordt UITSLUITEND met een geldig JSON-object, zonder markdown-codeblokken, zonder inleidende tekst, exact volgens dit schema:

{
  "analyse": "korte professionele analyse van de uitgangssituatie (3-5 zinnen), gebaseerd op de opgegeven afmetingen, woningtype en context",
  "renderPrompt": "een volledige, kant-en-klare Engelstalige prompt van minstens 150 woorden om te gebruiken in een AI-beeldgenerator voor een fotorealistische 3D-render van deze tuin, inclusief stijl, materialen, beplanting, verlichting, camera-instructies om gevel/perceelsgrenzen te behouden, en kwaliteitsmodifiers zoals 'ultra realistic, 8K, architectural rendering'",
  "concepten": [
    {"naam": "Concept 1 – Budgetvriendelijk", "beschrijving": "2-3 zinnen", "prijsindicatie": "€X.XXX - €X.XXX"},
    {"naam": "Concept 2 – Premium", "beschrijving": "2-3 zinnen", "prijsindicatie": "€X.XXX - €X.XXX"},
    {"naam": "Concept 3 – High-end droomtuin", "beschrijving": "2-3 zinnen", "prijsindicatie": "€X.XXX - €X.XXX"}
  ],
  "materialenlijst": [
    {"categorie": "Terras/verharding", "items": ["item met geschatte hoeveelheid/eenheid"]},
    {"categorie": "Constructies", "items": ["..."]},
    {"categorie": "Afwerking", "items": ["..."]}
  ],
  "beplantingsplan": [
    {"zone": "bv. Terrasrand zuidgevel", "planten": ["plantnaam - aantal - functie (bv. privacy, kleur, structuur)"]}
  ],
  "lichtplan": [
    {"zone": "bv. Terras", "type": "bv. grondspots + LED-strip onder zitbank", "effect": "korte beschrijving sfeer"}
  ],
  "uitvoeringsfasen": [
    {"fase": "Fase 1 - Grondwerken", "duur": "bv. 1-2 weken", "omschrijving": "korte omschrijving"}
  ],
  "kostencalculatie": {
    "grondwerken": "€X.XXX",
    "terrassen": "€X.XXX",
    "beplanting": "€X.XXX",
    "verlichting": "€X.XXX",
    "constructiesEnZwembad": "€X.XXX",
    "afwerking": "€X.XXX",
    "totaalIndicatie": "€XX.XXX - €XX.XXX"
  },
  "voordelen": ["3-5 concrete voordelen van dit ontwerp"],
  "aandachtspunten": ["2-4 nadelen/aandachtspunten, eerlijk en concreet"],
  "onderhoud": "2-3 zinnen over verwachte onderhoudsinspanning gegeven het gekozen niveau",
  "seizoensbeleving": "2-3 zinnen over hoe de tuin doorheen de seizoenen aanvoelt",
  "upsellVoorstellen": [
    {"naam": "bv. Robotmaaier", "reden": "korte, concrete reden waarom dit past bij deze klant/tuin", "prijsindicatie": "€XXX - €X.XXX"}
  ],
  "offerteSamenvatting": "een korte, klantvriendelijke samenvattende tekst (5-8 zinnen) zoals je bovenaan een offerte zou zetten, die de klant enthousiast maakt en de kernkeuzes samenvat",
  "verkoopPresentatieTekst": "een doorlopende tekst van 6-10 zinnen geschikt als voice-over of intro-slide voor een verkooppresentatie aan de klant, enthousiasmerend en professioneel, geen opsomming"
}

Regels:
- Wees realistisch qua schaal, budget en technische uitvoerbaarheid gegeven de Belgische context en het opgegeven budget.
- Alle prijsindicaties moeten onderling consistent zijn en passen bij het opgegeven budget (indien gegeven).
- Gebruik geen theoretische vulling; alles moet direct bruikbaar zijn door een tuinaannemer.
- Baseer je zoveel mogelijk op wat de klant effectief heeft opgegeven; vul enkel professioneel en realistisch aan waar nodig.`;

    try {
      setLoadingStage("Tuinsituatie analyseren...");

      const userContent = [];
      if (photoData) {
        const mediaType = photoData.substring(5, photoData.indexOf(";"));
        const base64 = photoData.split(",")[1];
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        });
      }
      userContent.push({
        type: "text",
        text: `Hier is de intake van de klant. Stel het volledige ontwerp- en verkoopdossier op volgens het schema.\n\n${context}`,
      });

      setLoadingStage("Ontwerpconcepten en materialenlijst opstellen...");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!response.ok) throw new Error("API request mislukt");
      const data = await response.json();

      setLoadingStage("Offerte en kostencalculatie afwerken...");

      const textBlock = data.content.find((b) => b.type === "text");
      let raw = textBlock?.text || "{}";
      raw = raw.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error("Kon antwoord niet verwerken");
      }

      setResult(parsed);
      setStep(5);
    } catch (err) {
      console.error(err);
      setError("Er ging iets mis bij het genereren van het dossier. Probeer opnieuw.");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  const next = () => {
    if (step === 4) {
      generate();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const copyPrompt = (text) => {
    navigator.clipboard?.writeText(text);
  };

  const [exporting, setExporting] = useState(false);

  const exportDocx = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const heading = (text) =>
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 320, after: 140 },
          children: [new TextRun({ text, bold: true, color: "1F2A22", font: "Georgia" })],
        });

      const body = (text, opts = {}) =>
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: text || "", font: "Calibri", size: 22, ...opts })],
        });

      const bullet = (text) =>
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text, font: "Calibri", size: 22 })],
        });

      const rule = () =>
        new Paragraph({
          spacing: { after: 200 },
          border: { bottom: { color: "B5602F", space: 1, style: BorderStyle.SINGLE, size: 6 } },
          children: [new TextRun({ text: "" })],
        });

      const twoColTable = (rows, headerA, headerB) =>
        new Table({
          width: { size: 9350, type: WidthType.DXA },
          columnWidths: [6350, 3000],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 6350, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: "1F2A22" },
                  children: [new Paragraph({ children: [new TextRun({ text: headerA, bold: true, color: "F6F1E7", size: 20 })] })],
                }),
                new TableCell({
                  width: { size: 3000, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: "1F2A22" },
                  children: [new Paragraph({ children: [new TextRun({ text: headerB, bold: true, color: "F6F1E7", size: 20 })] })],
                }),
              ],
            }),
            ...rows.map(
              ([a, b]) =>
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 6350, type: WidthType.DXA },
                      children: [new Paragraph({ children: [new TextRun({ text: a, size: 20 })] })],
                    }),
                    new TableCell({
                      width: { size: 3000, type: WidthType.DXA },
                      children: [new Paragraph({ children: [new TextRun({ text: b, bold: true, size: 20, color: "B5602F" })] })],
                    }),
                  ],
                })
            ),
          ],
        });

      const children = [];

      // Title
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: klantnaam ? `Tuinontwerp — ${klantnaam}` : "Tuinontwerp", bold: true, size: 40, font: "Georgia", color: "1F2A22" })],
        }),
        new Paragraph({
          spacing: { after: 260 },
          children: [
            new TextRun({
              text: [adres, woningType, afmetingen].filter(Boolean).join("  ·  "),
              italics: true,
              size: 20,
              color: "5C6B4F",
              font: "Calibri",
            }),
          ],
        }),
        rule()
      );

      if (result.offerteSamenvatting) {
        children.push(body(result.offerteSamenvatting, { italics: true }));
      }

      if (result.analyse) {
        children.push(heading("Analyse uitgangssituatie"), body(result.analyse));
      }

      if (result.concepten?.length) {
        children.push(heading("Ontwerpconcepten"));
        result.concepten.forEach((c) => {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: c.naam, bold: true, size: 22, color: "1F2A22" })],
            }),
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: c.beschrijving, size: 21 })],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [new TextRun({ text: c.prijsindicatie, bold: true, size: 21, color: "B5602F" })],
            })
          );
        });
      }

      if (result.materialenlijst?.length) {
        children.push(heading("Materialenlijst"));
        result.materialenlijst.forEach((m) => {
          children.push(
            new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: m.categorie, bold: true, size: 21, color: "5C6B4F" })] }),
            ...(m.items || []).map((it) => bullet(it))
          );
        });
      }

      if (result.beplantingsplan?.length) {
        children.push(heading("Beplantingsplan"));
        result.beplantingsplan.forEach((b) => {
          children.push(
            new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: b.zone, bold: true, size: 21, color: "5C6B4F" })] }),
            ...(b.planten || []).map((p) => bullet(p))
          );
        });
      }

      if (result.lichtplan?.length) {
        children.push(heading("Lichtplan"));
        result.lichtplan.forEach((l) => {
          children.push(
            body(`${l.zone} — ${l.type}`, { bold: true }),
            body(l.effect)
          );
        });
      }

      if (result.uitvoeringsfasen?.length) {
        children.push(heading("Uitvoeringsfasen"));
        result.uitvoeringsfasen.forEach((f) => {
          children.push(
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({ text: `${f.fase}  `, bold: true, size: 21 }),
                new TextRun({ text: `(${f.duur})`, italics: true, size: 20, color: "A8895A" }),
                new TextRun({ text: `  —  ${f.omschrijving}`, size: 21 }),
              ],
            })
          );
        });
      }

      if (result.kostencalculatie) {
        children.push(heading("Kostencalculatie"));
        const entries = Object.entries(result.kostencalculatie).filter(([k]) => k !== "totaalIndicatie");
        const labelMap = {
          grondwerken: "Grondwerken",
          terrassen: "Terrassen",
          beplanting: "Beplanting",
          verlichting: "Verlichting",
          constructiesEnZwembad: "Constructies & zwembad",
          afwerking: "Afwerking",
        };
        children.push(
          twoColTable(
            entries.map(([k, v]) => [labelMap[k] || k, v]),
            "Post",
            "Indicatie"
          ),
          new Paragraph({
            spacing: { before: 160, after: 200 },
            children: [
              new TextRun({ text: "Totaalindicatie:  ", bold: true, size: 24 }),
              new TextRun({ text: result.kostencalculatie.totaalIndicatie, bold: true, size: 24, color: "B5602F" }),
            ],
          })
        );
      }

      if (result.voordelen?.length) {
        children.push(heading("Voordelen"), ...result.voordelen.map((v) => bullet(v)));
      }
      if (result.aandachtspunten?.length) {
        children.push(heading("Aandachtspunten"), ...result.aandachtspunten.map((v) => bullet(v)));
      }

      if (result.onderhoud || result.seizoensbeleving) {
        children.push(heading("Onderhoud & seizoensbeleving"));
        if (result.onderhoud) children.push(body(`Onderhoud: ${result.onderhoud}`));
        if (result.seizoensbeleving) children.push(body(`Seizoensbeleving: ${result.seizoensbeleving}`));
      }

      if (result.upsellVoorstellen?.length) {
        children.push(heading("Upsell-voorstellen"));
        result.upsellVoorstellen.forEach((u) => {
          children.push(
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({ text: `${u.naam}  `, bold: true, size: 21 }),
                new TextRun({ text: `(${u.prijsindicatie})`, size: 20, color: "B5602F" }),
                new TextRun({ text: `  —  ${u.reden}`, size: 20, color: "5C6B4F" }),
              ],
            })
          );
        });
      }

      if (result.renderPrompt) {
        children.push(
          heading("Bijlage: 3D-render prompt"),
          new Paragraph({
            spacing: { after: 200 },
            shading: { type: ShadingType.CLEAR, fill: "EFE6D4" },
            children: [new TextRun({ text: result.renderPrompt, font: "Consolas", size: 18, color: "1F2A22" })],
          })
        );
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (klantnaam || "tuinontwerp").replace(/[^a-z0-9]+/gi, "_");
      a.download = `Ontwerpdossier_${safeName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Exporteren naar Word is mislukt. Probeer opnieuw.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: C.ivory,
        minHeight: "100vh",
        color: C.ink,
        padding: "0",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${C.terracotta}; color: ${C.ivory}; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.line}`, padding: "28px 32px 20px", background: C.ivory }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, maxWidth: 980, margin: "0 auto" }}>
          <Leaf size={20} color={C.moss} />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, margin: 0, letterSpacing: "-0.01em" }}>
            Tuinontwerp Intake
          </h1>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: C.brass, marginLeft: 4 }}>
            AI-ontwerp- & verkoopdossier
          </span>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 4, maxWidth: 980, margin: "22px auto 0", overflowX: "auto" }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px 7px 8px",
                  borderRadius: 999,
                  background: active ? C.ink : done ? C.ivoryDeep : "transparent",
                  color: active ? C.ivory : done ? C.ink : C.inkSoft,
                  fontSize: 12.5,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  opacity: active || done ? 1 : 0.55,
                }}
              >
                {done ? <Check size={13} /> : <Icon size={13} />}
                {s.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 32px 80px" }}>
        {/* STEP 0: Photo */}
        {step === 0 && (
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Foto van de huidige tuin</h2>
            <p style={{ color: C.inkSoft, fontSize: 14.5, marginBottom: 22, maxWidth: 560 }}>
              Upload een foto. Dit helpt de AI de bestaande situatie correct te analyseren en camerapositie/gevel te respecteren bij de renderprompt. Optioneel — je kan ook zonder foto verdergaan.
            </p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {!photoData ? (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "100%",
                  maxWidth: 420,
                  padding: "48px 20px",
                  borderRadius: 16,
                  border: `1.5px dashed ${C.brass}`,
                  background: "#FFFDF9",
                  color: C.moss,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                }}
              >
                <ImageIcon size={26} />
                Klik om een foto te kiezen
              </button>
            ) : (
              <div style={{ position: "relative", maxWidth: 420 }}>
                <img src={photoData} alt="Tuin" style={{ width: "100%", borderRadius: 16, display: "block" }} />
                <button
                  onClick={() => { setPhotoData(null); setPhotoName(""); }}
                  style={{ position: "absolute", top: 10, right: 10, background: C.ink, color: C.ivory, border: "none", borderRadius: 999, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Basis */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, marginBottom: 22 }}>Basisgegevens</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Field label="Naam klant"><TextInput value={klantnaam} onChange={setKlantnaam} placeholder="bv. Familie Dewulf" /></Field>
              <Field label="Locatie tuin"><TextInput value={adres} onChange={setAdres} placeholder="bv. Roeselare" /></Field>
              <Field label="Type woning"><TextInput value={woningType} onChange={setWoningType} placeholder="bv. moderne villa, jaren '30 woning" /></Field>
              <Field label="Afmetingen tuin *"><TextInput value={afmetingen} onChange={setAfmetingen} placeholder="bv. 15m x 20m, of 'ca. 300m²'" /></Field>
            </div>
          </div>
        )}

        {/* STEP 2: Stijl & functies */}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, marginBottom: 22 }}>Stijl & gewenste functies</h2>
            <Field label="Gewenste stijl (meerdere mogelijk) *">
              <MultiToggleGroup options={STYLES} selected={stijl} onToggle={(v) => toggle(stijl, setStijl, v)} />
            </Field>
            <RootDivider />
            <Field label="Gewenste functies *">
              <MultiToggleGroup options={FUNCTIES} selected={functies} onToggle={(v) => toggle(functies, setFuncties, v)} />
            </Field>
          </div>
        )}

        {/* STEP 3: Materiaal & beplanting */}
        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, marginBottom: 22 }}>Materiaal & beplanting</h2>
            <Field label="Gewenste materialen">
              <MultiToggleGroup options={MATERIALEN} selected={materialen} onToggle={(v) => toggle(materialen, setMaterialen, v)} />
            </Field>
            <RootDivider />
            <Field label="Gewenste beplanting">
              <MultiToggleGroup options={BEPLANTING} selected={beplanting} onToggle={(v) => toggle(beplanting, setBeplanting, v)} />
            </Field>
          </div>
        )}

        {/* STEP 4: Budget */}
        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, marginBottom: 22 }}>Budget, onderhoud & extra's</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Field label="Budget"><TextInput value={budget} onChange={setBudget} placeholder="bv. €40.000 - €60.000" /></Field>
              <Field label="Onderhoudsniveau">
                <div style={{ display: "flex", gap: 8 }}>
                  {ONDERHOUD.map((o) => (
                    <Toggle key={o} active={onderhoud === o} onClick={() => setOnderhoud(o)}>{o}</Toggle>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Extra wensen / context">
              <TextArea value={extraWensen} onChange={setExtraWensen} placeholder="bv. hond in de tuin, veel privacy nodig t.o.v. buren, wil graag zoveel mogelijk groen behouden..." />
            </Field>
            <RootDivider />
            <Field label="Interesse in upsells (optioneel)">
              <MultiToggleGroup options={UPSELLS} selected={upsells} onToggle={(v) => toggle(upsells, setUpsells, v)} />
            </Field>
          </div>
        )}

        {/* STEP 5: Result */}
        {step === 5 && (
          <div>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16 }}>
                <Loader2 size={30} color={C.moss} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17 }}>{loadingStage || "Dossier wordt opgesteld..."}</div>
                <div style={{ color: C.inkSoft, fontSize: 13 }}>Dit duurt doorgaans 15-30 seconden.</div>
              </div>
            )}

            {error && (
              <div style={{ padding: 20, background: "#FDEEE8", border: `1px solid ${C.terracotta}`, borderRadius: 12, color: C.terracotta, marginBottom: 20 }}>
                {error}
                <button onClick={generate} style={{ marginLeft: 14, background: C.terracotta, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>
                  Opnieuw proberen
                </button>
              </div>
            )}

            {result && !loading && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ marginBottom: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.brass }}>
                      Ontwerpdossier
                    </div>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                      {klantnaam ? `Tuin ${klantnaam}` : "Jouw tuinontwerp"}
                    </h2>
                  </div>
                  <button
                    onClick={exportDocx}
                    disabled={exporting}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: C.moss, color: C.ivory, border: "none",
                      borderRadius: 999, padding: "11px 20px", fontSize: 13.5,
                      fontWeight: 600, cursor: exporting ? "default" : "pointer",
                      opacity: exporting ? 0.7 : 1, whiteSpace: "nowrap",
                    }}
                  >
                    {exporting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />}
                    {exporting ? "Document wordt gemaakt..." : "Exporteer als Word"}
                  </button>
                </div>
                <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.6, maxWidth: 680, marginTop: 16, marginBottom: 28 }}>
                  {result.offerteSamenvatting}
                </p>

                <Section title="Analyse uitgangssituatie">
                  <p style={{ lineHeight: 1.7, fontSize: 14.5 }}>{result.analyse}</p>
                </Section>

                <Section title="3D-render prompt (kopieer naar je beeldgenerator)">
                  <div style={{ position: "relative" }}>
                    <pre style={{
                      background: C.ink, color: C.ivory, padding: 18, borderRadius: 12,
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.6,
                      whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 260, overflowY: "auto"
                    }}>
                      {result.renderPrompt}
                    </pre>
                    <button
                      onClick={() => copyPrompt(result.renderPrompt)}
                      style={{ position: "absolute", top: 10, right: 10, background: C.brass, color: C.ink, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                    >
                      Kopieer
                    </button>
                  </div>
                </Section>

                <Section title="Drie ontwerpconcepten">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                    {result.concepten?.map((c, i) => (
                      <div key={i} style={{ background: "#FFFDF9", border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
                        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{c.naam}</div>
                        <p style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.6, marginBottom: 10 }}>{c.beschrijving}</p>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.terracotta, fontWeight: 600 }}>{c.prijsindicatie}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Materialenlijst">
                  {result.materialenlijst?.map((m, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: C.moss }}>{m.categorie}</div>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.8 }}>
                        {m.items?.map((it, j) => <li key={j}>{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </Section>

                <Section title="Beplantingsplan" icon={Leaf}>
                  {result.beplantingsplan?.map((b, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: C.moss }}>{b.zone}</div>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.8 }}>
                        {b.planten?.map((p, j) => <li key={j}>{p}</li>)}
                      </ul>
                    </div>
                  ))}
                </Section>

                <Section title="Lichtplan" icon={Lightbulb}>
                  <div style={{ display: "grid", gap: 10 }}>
                    {result.lichtplan?.map((l, i) => (
                      <div key={i} style={{ background: "#FFFDF9", border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.zone} — <span style={{ fontWeight: 400, color: C.inkSoft }}>{l.type}</span></div>
                        <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>{l.effect}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Uitvoeringsfasen" icon={CalendarClock}>
                  <div style={{ display: "grid", gap: 10 }}>
                    {result.uitvoeringsfasen?.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.brass, minWidth: 90 }}>{f.duur}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{f.fase}</div>
                          <div style={{ fontSize: 13, color: C.inkSoft }}>{f.omschrijving}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Kostencalculatie" icon={Euro}>
                  {result.kostencalculatie && (
                    <div style={{ background: "#FFFDF9", border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
                      {Object.entries(result.kostencalculatie).filter(([k]) => k !== "totaalIndicatie").map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13.5 }}>
                          <span style={{ textTransform: "capitalize", color: C.inkSoft }}>{k.replace(/([A-Z])/g, " $1")}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontSize: 15 }}>
                        <span style={{ fontWeight: 600 }}>Totaalindicatie</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.terracotta }}>{result.kostencalculatie.totaalIndicatie}</span>
                      </div>
                    </div>
                  )}
                </Section>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Section title="Voordelen">
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9 }}>
                      {result.voordelen?.map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </Section>
                  <Section title="Aandachtspunten">
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9, color: C.inkSoft }}>
                      {result.aandachtspunten?.map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </Section>
                </div>

                <Section title="Onderhoud & seizoensbeleving">
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 10 }}><strong>Onderhoud: </strong>{result.onderhoud}</p>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7 }}><strong>Seizoensbeleving: </strong>{result.seizoensbeleving}</p>
                </Section>

                <Section title="Upsell-voorstellen">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    {result.upsellVoorstellen?.map((u, i) => (
                      <div key={i} style={{ background: C.ivoryDeep, borderRadius: 12, padding: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.naam}</div>
                        <div style={{ fontSize: 12.5, color: C.inkSoft, margin: "4px 0" }}>{u.reden}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.terracotta, fontWeight: 600 }}>{u.prijsindicatie}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Verkooppresentatie — intro tekst">
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: 15.5, lineHeight: 1.8, fontStyle: "italic", color: C.moss }}>
                    "{result.verkoopPresentatieTekst}"
                  </p>
                </Section>

                <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
                  <button
                    onClick={() => { setStep(0); setResult(null); }}
                    style={{ background: C.ink, color: C.ivory, border: "none", borderRadius: 999, padding: "12px 26px", fontSize: 13.5, cursor: "pointer", fontWeight: 500 }}
                  >
                    Nieuw dossier starten
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav footer */}
      {step < 5 && (
        <div style={{ position: "sticky", bottom: 0, background: C.ivory, borderTop: `1px solid ${C.line}`, padding: "16px 32px" }}>
          <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={prev}
              disabled={step === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "transparent",
                border: "none", color: step === 0 ? C.line : C.inkSoft, cursor: step === 0 ? "default" : "pointer",
                fontSize: 14, fontWeight: 500,
              }}
            >
              <ChevronLeft size={16} /> Vorige
            </button>
            <button
              onClick={next}
              disabled={!canProceed()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: canProceed() ? C.terracotta : C.line,
                color: canProceed() ? "#fff" : C.inkSoft,
                border: "none", borderRadius: 999, padding: "12px 24px",
                fontSize: 14, fontWeight: 600, cursor: canProceed() ? "pointer" : "default",
              }}
            >
              {step === 4 ? "Genereer dossier" : "Volgende"} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        {Icon && <Icon size={15} color={C.moss} />}
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16.5, fontWeight: 600, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
