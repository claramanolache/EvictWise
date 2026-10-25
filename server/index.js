const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { TranslationServiceClient } = require("@google-cloud/translate");

const app = express();
app.disable("x-powered-by");
// Set only when deployed behind this exact number of trusted reverse proxies.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(proxyHops) && proxyHops > 0) app.set("trust proxy", proxyHops);
const translationClient = new TranslationServiceClient();

const PORT = Number(process.env.PORT || 3001);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:8081";

app.use(require("./security.cjs").security({ production: process.env.NODE_ENV === "production" }));
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

const json = express.json({ limit: "300kb" });
// Authenticate before accepting a larger image payload.
app.use((req, res, next) => req.path === "/api/auth/document-ai" ? next() : json(req, res, next));

// Authentication storage is opened only when an account endpoint is used.
let auth;
app.use("/api/auth", (req, res, next) => {
  try {
    auth ??= require("./auth.cjs").createAuthRouter({ origin: CLIENT_ORIGIN });
    auth.router(req, res, next);
  } catch { res.status(503).json({ error: "authUnavailable" }); }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, capabilities: { ragChat: true } });
});

app.post("/api/translate", require("./translation-handler.cjs").createTranslationHandler(translationClient, PROJECT_ID, CLIENT_ORIGIN));

if (process.env.WEB_DIST) {
  const web = require("./web.cjs").webRouter(process.env.WEB_DIST);
  app.use((req, res, next) => req.path.startsWith("/api") ? next() : web(req, res, next));
}

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
