# CLAUDE.md — PTG Performance Hub

> AI assistant context for the PTG Nutrition Engine / Performance Hub codebase.

---

## Project Overview

**PTG Performance Hub** is a single-file React SPA (Client Artifact) for **PTG Center** (ptg-center.be), a Belgian personal training / nutrition coaching business run by Gianni Derieuw. It is a nutrition & performance coaching tool that:

- Lets clients register, upload InBody body-composition scans, and complete an AI-driven intake interview.
- Generates personalized PTG Score (0–100), segmentation, macros, meal plans, and 12-week training blocks via the Claude AI API.
- Gives the coach a dashboard to oversee all client scans and reports.

The application is deployed as a self-contained **Claude Artifact** (or similar iframe-based host). All state is stored in **browser `localStorage`** — there is no backend, no database, and no server.

---

## Repository Structure

```
PTGcenter/
├── README.md          # Minimal placeholder
├── CLAUDE.md          # This file
└── src/
    └── App.jsx        # Entire application — single file
```

> The entire application lives in one file. Do not split it into multiple files unless explicitly asked — the single-file architecture is intentional for the artifact deployment model.

---

## Technology Stack

| Layer | Choice |
|---|---|
| UI framework | React 18 (hooks only, no class components) |
| Language | JavaScript (JSX) — no TypeScript |
| Styling | Inline styles + a single injected `<style>` tag (`css` constant) |
| Fonts | Google Fonts: Syne (headings) + JetBrains Mono (body/mono) |
| AI | Anthropic Claude API — `claude-sonnet-4-6`, `max_tokens: 4096` |
| Storage | `localStorage` only via the `DB` helper |
| Build | None — intended as a Claude Artifact (raw JSX evaluated in-browser) |

---

## Key Constants & Configuration

### `G` — Design Tokens
All colors and theme values live in a single object. Never hardcode hex values anywhere else.

```js
const G = {
  bg: "#080808", card: "#0f0f0f", border: "#1c1c1c",
  orange: "#E84020", orangeDim: "rgba(232,64,32,0.1)",
  text: "#e0d8cc", muted: "#555", dim: "#2a2a2a",
  green: "#2ECC71", blue: "#3B82F6", yellow: "#F5C518", red: "#EF4444",
};
```

### `COACH` — Hardcoded Coach Credentials
```js
const COACH = { email: "gianni@ptg-center.be", password: "PTG2025!", name: "Gianni Derieuw" };
```
**Important**: These credentials are embedded client-side. This is acceptable for the artifact model but must not be moved to a real server without proper auth.

### `css` — Global Stylesheet
A template-literal string injected via `<style>{css}</style>` in the Login component. Defines utility classes:
- `.fi` — fade-in animation
- `.pulse` — opacity pulse animation
- `.blink` — cursor blink animation
- `.btn`, `.bp`, `.bg` — button variants (primary, ghost)
- `.tab` / `.tab.a` — tab navigation
- `.sr` — animated SVG stroke (ring)
- `.rh:hover` — row hover highlight

### `COACH_SYS` — AI System Prompt
Large Dutch-language system prompt that drives the intake interview. Contains:
- 9 intake modules (Baseline → Psychology)
- Trigger keyword: `"INTAKE_VOLTOOID"` signals completion
- Expected JSON schema for the full strategy report

**Do not modify the system prompt structure without understanding the full JSON schema** it expects to emit — the UI depends on specific keys (`ptg_score`, `meal_plan`, `training_blocks`, `weekly_meal_plan`, `coach_snapshot`, etc.).

---

## Data Model

### Client Object (stored in `ptg_clients` localStorage key)
```js
{
  id: string,           // Date.now().toString()
  name: string,
  email: string,
  password: string,     // plaintext — artifact-only acceptable
  createdAt: ISO string,
  scans: Scan[]
}
```

### Scan Object
```js
{
  id: string,
  date: ISO string,
  inbody: InBodyValues | null,
  strategy: StrategyJSON,  // full AI-generated report
  ptg_score: number
}
```

### InBody Values
```js
{
  weight_kg: string,      // always strings from <input type="number">
  smm_kg: string,         // skeletal muscle mass
  body_fat_kg: string,
  body_fat_pct: string,
  visceral_fat: string,
  bmr_kcal: string
}
```

### Strategy JSON (AI output)
Key fields the UI consumes:
```
ptg_score, segment, strategy_type, complexity_level,
tdee_kcal, target_kcal, protein_g, carbs_g, fat_g,
meals_per_day, coach_snapshot, red_flags,
meal_plan[], weekly_meal_plan{}, training_blocks[],
weekly_adjustments[], supplements[], body_stats{}
```

---

## Storage Layer (`DB`)

```js
DB.get(key)   // JSON.parse from localStorage, returns null on error
DB.set(key,v) // JSON.stringify to localStorage, silent on error
DB.del(key)   // localStorage.removeItem
```

**localStorage keys in use:**
| Key | Contents |
|---|---|
| `ptg_session` | Current logged-in user object |
| `ptg_clients` | Array of all client objects |
| `ptg_coach_sessions` | Coach-created sessions (not tied to a client account) |

---

## Component Tree

```
App
├── Login                    — email/password login + registration
├── Intake                   — full intake flow (stateful wizard)
│   ├── ScanWizard           — multi-photo InBody upload flow
│   │   └── PhotoStep        — per-photo page-type selector + value entry
│   ├── ManualForm           — fallback: manual InBody value entry
│   └── Rapport              — final report view after AI generation
│       ├── Ring             — circular SVG score ring
│       ├── MBar             — macro distribution bar
│       ├── Training         — 12-week training block viewer
│       └── Chart            — SVG progress line chart
├── ClientPortal             — client dashboard (overview / scans / progress)
│   ├── Rapport
│   └── Chart
└── CoachDash                — coach dashboard (all clients + all scans)
    ├── Rapport
    └── Chart
```

---

## Routing / Navigation

There is **no router**. Navigation is pure conditional rendering in `App`:

```
!user            → <Login>
intake === true  → <Intake>
user.role==="coach" → <CoachDash>
user.role==="client" → <ClientPortal>
```

---

## AI Integration (`callAI`)

`callAI(messages, system, images=[])` calls `https://api.anthropic.com/v1/messages`.

**CORS handling strategy** (required for browser-direct API calls):
1. First tries `fetch()` with `anthropic-dangerous-direct-browser-access: true` header.
2. Falls back to `XMLHttpRequest` (sometimes bypasses iOS CORS issues).
3. Throws a user-visible Dutch error if both fail (iOS Safari limitation).

**Image support**: Images are base64-encoded via `toB64()` which resizes to max 1024px on a canvas before encoding to JPEG at 0.85 quality.

**Important**: The API key is expected to be available in the deployment environment (Claude Artifacts injects it). Do not add an API key input field unless explicitly requested.

---

## Intake Flow (State Machine)

`Intake` component `step` states:
```
"inbody" → "chat" → "generating" → "done"
```

- **inbody**: User uploads InBody photos (ScanWizard) or enters manually (ManualForm), or skips entirely.
- **chat**: Multi-turn AI conversation. Monitors response text for `"INTAKE_VOLTOOID"` to trigger transition.
- **generating**: Displays loading animation while parsing/requesting JSON from AI.
- **done**: Shows completed `Rapport`. User can save and navigate to portal.

**JSON extraction**: `parseJ()` tries markdown code-fence extraction first, then bare object extraction. If both fail after `INTAKE_VOLTOOID` is detected, a second AI call explicitly requests the JSON.

---

## InBody Scan Wizard

`SPAGES` defines 7 scan page types, each with an `id`, `title`, `hint`, and `fields[]`. The wizard:
1. Accepts 1–7 uploaded images.
2. Assigns each image a page type (defaults to the matching `SPAGES` index).
3. User manually reads values from the photo and enters them.
4. On final step, merges all entered values (first non-empty value per field wins).
5. Returns merged `InBodyValues` to `Intake.startChat()`.

**Note**: There is no OCR — values are always entered manually by the user.

---

## Helper Functions

| Function | Purpose |
|---|---|
| `sc(score)` | Returns color from `G` based on score threshold (80/60/40) |
| `seg(segment)` | Returns color for a named segment string |
| `fd(date)` | Formats date to Dutch locale (`dd mmm yyyy`) |
| `parseJ(text)` | Extracts and parses JSON from AI response text |
| `toB64(file)` | Converts File → resized base64 JPEG `{data, type, preview}` |

---

## UI Conventions

- **Font families**: `Syne` for headings/labels/scores, `JetBrains Mono` for all body text, inputs, and buttons.
- **Color**: Always use `G.*` constants. Orange (`#E84020`) is the primary brand color.
- **Spacing**: `padding` and `gap` values are small and consistent (4–16px range).
- **Borders**: `1px solid ${G.border}` for card borders; accent borders use `2–3px solid <color>` on left edge.
- **Typography scale**: `0.48–0.58rem` for labels/metadata, `0.68–0.76rem` for body, `0.85–1.1rem` for values, `1.2–1.4rem` for hero numbers.
- **Animations**: Use existing CSS classes (`.fi`, `.pulse`, `.blink`). Do not add new `@keyframes`.
- **All user-facing text**: Dutch (`nl-BE`).

---

## Segment Classification

| Segment | Color |
|---|---|
| High Performer | Green |
| Optimization Candidate | Blue |
| Overworked Professional | Yellow |
| Burnout Risk | Red |
| Foundation Phase | Muted |

---

## Development Guidelines for AI Assistants

### Do
- Keep everything in one file (`App.jsx`) unless explicitly told otherwise.
- Use `G.*` for all colors.
- Use Dutch for all user-visible strings.
- Follow the existing `inline style` pattern — no CSS modules, no Tailwind.
- Use functional components with hooks only.
- Test localStorage reads defensively (use `DB.get` which returns `null` on error).
- When adding new AI interactions, follow the `callAI` pattern with fetch → XHR fallback.

### Don't
- Don't add a router (React Router, etc.) — conditional rendering is intentional.
- Don't add TypeScript — the project is plain JS/JSX.
- Don't add a backend or server — localStorage is the intentional persistence layer.
- Don't add an API key input field — the deployment environment provides it.
- Don't split into multiple files unless explicitly requested.
- Don't add `console.log` statements in production code.
- Don't modify `COACH_SYS` without understanding the full downstream JSON schema.
- Don't change `COACH` credentials without confirmation from the user.
- Don't add error boundaries or complex fallbacks — the app handles errors inline.

---

## Deployment

This app is designed to run as a **Claude Artifact** (browser-embedded iframe). The build process is:
- None — raw JSX is evaluated by the artifact runtime.
- The Claude API key is injected by the artifact host.
- `localStorage` is scoped to the artifact's origin.

For standalone deployment (e.g., Vite + React), a standard `npm create vite` scaffold with the JSX file as `src/App.jsx` would work. No additional dependencies beyond React are needed.

---

## Known Limitations

1. **iOS Safari**: Direct API calls fail due to CORS restrictions. The XHR fallback also fails. Users must use desktop Chrome/Firefox.
2. **No real auth**: Passwords stored in plaintext in `localStorage`. Acceptable for artifact model only.
3. **No OCR**: InBody scan values must be entered manually even when photos are uploaded.
4. **No cloud sync**: All data is local to the browser. Clearing browser data deletes everything.
5. **Single coach account**: Coach credentials are hardcoded. Multi-coach scenarios are not supported.
