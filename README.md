# Tuinontwerp Intake

Multi-step intake tool for a landscaping business: a customer's garden requirements go in,
an AI-generated design dossier (concepts, materials list, planting plan, lighting plan,
cost estimate, upsells, and a Word export) comes out.

## Stack

- React + Vite for the frontend (`src/`)
- A small Express server (`server/index.js`) that proxies requests to the Anthropic API,
  since the API key must stay server-side and Anthropic does not allow direct browser calls.

## Setup

```bash
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
npm start               # runs the API proxy (port 8787) and the Vite dev server together
```

Open the URL Vite prints (typically http://localhost:5173).

## Production build

```bash
npm run build           # outputs to dist/
npm run server          # serves dist/ and the /api/generate proxy on one port
```
