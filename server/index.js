const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { TranslationServiceClient } = require("@google-cloud/translate");

const app = express();
// Set only when deployed behind this exact number of trusted reverse proxies.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(proxyHops) && proxyHops > 0) app.set("trust proxy", proxyHops);
const translationClient = new TranslationServiceClient();

const PORT = Number(process.env.PORT || 3001);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:8081";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

// Authentication storage is opened only when an account endpoint is used.
let auth;
app.use("/api/auth", (req, res, next) => {
  try {
    auth ??= require("./auth.cjs").createAuthRouter({ origin: CLIENT_ORIGIN });
    auth.router(req, res, next);
  } catch { res.status(503).json({ error: "authUnavailable" }); }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/translate", async (req, res) => {
  try {
    const {
      text,
      texts,
      targetLanguage,
      sourceLanguage = "auto",
    } = req.body;

    const inputTexts = Array.isArray(texts)
      ? texts
      : typeof text === "string"
        ? [text]
        : [];

    if (!PROJECT_ID) {
      return res.status(500).json({
        error: "GOOGLE_CLOUD_PROJECT is missing from server/.env.",
      });
    }

    if (inputTexts.length === 0) {
      return res.status(400).json({
        error: "Provide text or texts.",
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        error: "targetLanguage is required.",
      });
    }

    if (
      sourceLanguage !== "auto" &&
      sourceLanguage === targetLanguage
    ) {
      return res.json({
        translations: inputTexts.map((value) => ({
          translatedText: value,
          detectedLanguageCode: sourceLanguage,
        })),
      });
    }

    const request = {
      parent: `projects/${PROJECT_ID}/locations/global`,
      contents: inputTexts,
      mimeType: "text/plain",
      targetLanguageCode: targetLanguage,
    };

    // Leave this out when using automatic detection.
    if (sourceLanguage !== "auto") {
      request.sourceLanguageCode = sourceLanguage;
    }

    const [response] =
      await translationClient.translateText(request);

    const translations = response.translations.map(
      (translation) => ({
        translatedText: translation.translatedText,
        detectedLanguageCode:
          translation.detectedLanguageCode || null,
      })
    );

    res.json({ translations });
  } catch (error) {
    console.error("Google Translation error:", error);

    res.status(500).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }
});

// API failures must remain JSON, including unknown routes and body-parser errors.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found. Check the URL and restart the API server." });
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === "entity.too.large" ? 413 : error.type === "entity.parse.failed" ? 400 : 500;
  res.status(status).json({ error: status === 413 ? "Request is too large. Please shorten your message." : status === 400 ? "Invalid JSON request." : "The API request failed. Please try again." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Translation server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
