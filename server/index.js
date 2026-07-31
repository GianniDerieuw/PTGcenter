import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

app.post("/api/generate", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  try {
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(req.body),
    });

    const data = await anthropicResponse.json();
    res.status(anthropicResponse.status).json(data);
  } catch (err) {
    console.error("Anthropic API request failed:", err);
    res.status(502).json({ error: "Failed to reach Anthropic API." });
  }
});

// Serve the built frontend (npm run build) so the app can run as a single deployment.
app.use(express.static(distDir));
app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) next(err);
  });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`API proxy listening on http://localhost:${PORT}`);
});
