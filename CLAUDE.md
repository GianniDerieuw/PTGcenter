# CLAUDE.md — PTG Center Nutrition Engine

## Project Overview

**PTG Center** is a single-file React web application for a Belgian fitness coaching center (PTG Center, `ptg-center.be`). It is a **nutrition and training strategy engine** that:

- Accepts InBody body-composition scan data from clients
- Generates personalized nutrition targets (kcal, macros, meal plans) and 12-week training blocks
- Computes a proprietary **PTG Score** (0–100) to segment clients
- Provides separate portals for the coach (`Gianni Derieuw`) and registered clients
- Persists all data via **`localStorage`** — there is no backend or database

The UI is entirely in **Dutch (Belgian)**.

---

## Repository Structure

```
PTGcenter/
├── CLAUDE.md          # This file
├── README.md          # Placeholder (empty)
└── src/App.jsx        # Entire application in one file (or equivalent entry point)
```

> The app is a single JSX file exporting a default `App` component. All logic, state, and UI live in this one file.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React (hooks: `useState`, `useRef`) |
| Styling | Inline styles only — no CSS files, no Tailwind, no CSS modules |
| Persistence | `localStorage` via the `db` helper |
| Build | Requires a bundler (Vite or Create React App) — not included in repo |
| Language | Dutch (Belgian) |
| Dependencies | React only (no routing library, no state manager, no UI library) |

---

## Architecture: Key Modules

### Constants & Helpers

| Name | Type | Purpose |
|---|---|---|
| `G` | Object | Global color palette (`G.orange`, `G.bg`, `G.card`, etc.) |
| `s(active)` | Function | Returns inline style object for input elements; highlights in orange when active |
| `COACH` | Object | **Hardcoded coach credentials** — see Security section |
| `db` | Object | localStorage wrapper: `db.get(key)`, `db.set(key, value)`, `db.del(key)` |
| `scoreColor(n)` | Function | Returns color based on PTG score thresholds (green/blue/yellow/red) |
| `fdt(date)` | Function | Formats ISO dates to `nl-BE` locale (`dd MMM yyyy`) |

### Core Algorithm: `buildStrat(inbody, form)`

The strategy generation function. Takes InBody data and intake form fields, returns a complete strategy object:

- **PTG Score** — composite score (38–94) factoring body fat %, visceral fat, stress, sleep, discipline, SMM
- **Segments** — `"High Performer"` (≥80) / `"Optimization Candidate"` (≥65) / `"Overworked Professional"` (≥50) / `"Foundation Phase"` (<50)
- **TDEE** — calculated as `BMR × activity multiplier` (job-based: 1.3 sedentary / 1.45 mixed / 1.6 active)
- **Target kcal** — TDEE −400 (fat loss) / TDEE +300 (muscle gain) / TDEE (recomp)
- **Macros** — protein, fat, carbs derived from targets and body composition
- **Red flags** — auto-generated warnings (sleep <6h, stress >7, visceral fat >10)
- **Meal plan** — 4 meals with macro splits and food examples
- **Weekly meal plan** — 7-day full plan (Monday–Sunday)
- **Supplements** — standard stack (creatine, whey, D3, magnesium)
- **Training blocks** — 3 × 4-week blocks (Foundation → Volume → Intensity), each with 4 sessions (Upper Push / Lower Squat / Upper Pull / Lower Hinge)

### UI Atoms

| Component | Props | Purpose |
|---|---|---|
| `Btn` | `onClick, disabled, full, ghost, small` | Primary button (orange) or ghost variant |
| `Row` | `gap, wrap, center` | Horizontal flex container |
| `Card` | `style` | Dark card container with border |
| `Label` | `color` | Uppercase micro-label (0.5rem, letter-spacing 2px) |
| `Input` | `value, onChange, placeholder, type, min, max` | Styled monospace input |
| `Chips` | `options, value, onChange` | Horizontal toggle button group |
| `Ring` | `score, size` | SVG circular progress ring for PTG Score |

### Feature Components

| Component | Purpose |
|---|---|
| `Training` | Renders training blocks with week/day navigation |
| `Rapport` | Full strategy report with tabs: Overzicht / Voeding / Training / Weekschema / Progressie |
| `Login` | Login + registration screen (coach and client flows) |
| `IBForm` | InBody data entry form (6 fields: weight, SMM, body fat %, body fat kg, visceral fat, BMR) |
| `IntakeForm` | Full intake form (age, height, sex, job, goal, training days, experience, sleep, stress, discipline) |
| `Intake` | Multi-step wizard: InBody → Intake Form → Result |
| `Header` | Sticky top bar with PTG logo, title, + SCAN, and logout |
| `ClientPortal` | Client view: Overzicht / Scans / Progressie tabs |
| `CoachDash` | Coach dashboard: stats overview + client list + all scans |

### App Root (`App`)

- Session stored in `localStorage` under key `ptg_session`
- Three screens: `portal` (default), `intake`
- Renders `Login` → `CoachDash` or `ClientPortal` based on `user.role`

---

## Data Model (localStorage)

| Key | Type | Description |
|---|---|---|
| `ptg_session` | `{role, id, name, email, ...}` | Active session |
| `ptg_clients` | `Client[]` | All registered clients |
| `ptg_coach_sessions` | `Scan[]` | Scans created by coach (standalone, no client account) |

**Client object:**
```js
{
  id: string,          // timestamp-based ID
  name: string,
  email: string,
  password: string,    // plaintext — see Security
  createdAt: ISO string,
  scans: Scan[]
}
```

**Scan object:**
```js
{
  id: string,
  date: ISO string,
  inbody: InBodyData,
  strategy: StrategyObject,
  ptg_score: number,
  clientName?: string  // only on coach_sessions
}
```

---

## Routing / Navigation

There is **no router**. Navigation is pure state:
- `screen` state in `App`: `"portal"` | `"intake"`
- Tabs within portals are local `tab` state
- Detail views use `selC` / `selS` state (selected client / selected scan)

---

## Styling Conventions

- All styling is **inline**, using the `G` palette object
- Font: `monospace` everywhere
- Base font sizes: labels 0.5rem, body 0.68–0.75rem, headings 0.88–1rem
- Color usage:
  - `G.orange` (`#E84020`) — primary accent, active states, PTG brand
  - `G.text` (`#e0d8cc`) — body text
  - `G.muted` (`#666`) — secondary/inactive text
  - `G.bg` (`#080808`) — page background
  - `G.card` (`#111`) — card backgrounds
  - Score colors: green ≥80, blue ≥60, yellow ≥40, red <40

---

## Security Issues (IMPORTANT)

> **These are critical issues that must be addressed before any production deployment.**

1. **Hardcoded coach credentials** — `COACH` constant contains plaintext email and password directly in source code. Anyone who can view source can access the coach dashboard.

2. **Plaintext passwords in localStorage** — Client passwords are stored unencrypted in `localStorage`. Anyone with browser dev-tools access can read all credentials.

3. **No server-side authentication** — All auth is client-side only. The `localStorage` data can be freely manipulated.

4. **No data encryption** — All client health data (body composition, strategies) is stored in plaintext in `localStorage`.

**When making changes, do NOT:**
- Add more hardcoded credentials
- Add new plaintext password storage
- Introduce backend connections without proper auth (JWT, sessions, etc.)

---

## Development Notes for AI Assistants

### When adding features:
- Keep the single-file structure unless explicitly asked to split files
- Follow the existing inline-style pattern using the `G` palette — do not introduce CSS files or Tailwind
- All new text content should be in **Dutch**
- New UI components should follow the `Btn / Card / Label / Row` atom pattern
- When adding new localStorage keys, document them in the Data Model section above

### When modifying `buildStrat`:
- The PTG Score formula is intentionally clamped to 38–94 (not 0–100) — preserve this
- All score thresholds (bf%, visceral, stress, sleep) have specific business logic — don't change thresholds without explicit instruction
- Macro calculations follow a specific priority: protein first (body-composition-based), fat at 27% kcal, carbs fill the remainder with a minimum of 80g

### When modifying training blocks:
- Blocks follow a 3-phase progressive structure (Foundation → Volume → Intensity)
- Sessions follow the Upper/Lower push-pull split pattern
- Each session has exactly 5 exercises

### Component patterns:
- State is always local (`useState`) — no global state management
- Data mutations always go through `db.set` then read back via `db.get`
- After writing client data, re-read `db.get("ptg_clients")` to get fresh state

---

## Running the App

Since there is no build config in this repo, the app requires a React bundler. Typical setup:

```bash
# With Vite (recommended)
npm create vite@latest . -- --template react
# Replace src/App.jsx with the PTG App component
npm install
npm run dev

# With Create React App
npx create-react-app .
# Replace src/App.js with the PTG App component
npm start
```

No additional npm packages are needed beyond React itself.

---

## Key Business Logic Reference

### PTG Score Calculation
```
base = 70
- body_fat_pct > 25 → -18
- body_fat_pct > 18 → -8
- visceral_fat > 10 → -10
- visceral_fat > 7  → -5
- stress > 7        → -10
- stress > 5        → -4
- sleep < 6         → -12
- sleep < 7         → -5
+ discipline > 7    → +6
+ smm_kg > 40       → +5
+ smm_kg > 35       → +2
clamped to [38, 94]
```

### Activity Multipliers
- `zittend` (sedentary desk job) → 1.3
- `gemengd` (mixed) → 1.45
- `actief` (physically active job) → 1.6

### Goal-based Calorie Adjustment
- `vetreductie` (fat loss) → TDEE − 400 kcal
- `spiermassa` (muscle gain) → TDEE + 300 kcal
- `recomp` (recomposition) → TDEE (maintenance)
