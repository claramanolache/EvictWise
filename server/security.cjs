const { randomUUID } = require('node:crypto');
function security({ production = process.env.NODE_ENV === 'production' } = {}) {
  return (req, res, next) => {
    req.requestId = randomUUID();
    res.set({ 'X-Request-ID': req.requestId, 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" });
    if (production) {
      res.set('Strict-Transport-Security', 'max-age=31536000');
      if (req.protocol !== 'https') return res.status(400).json({ error: 'HTTPS is required.' });
    }
    next();
  };
}
// Log only identifiers we generate, never provider messages, headers, or payloads.
function safeError(event, req) { console.error(JSON.stringify({ event, requestId: req.requestId })); }
function budget(limit, windowMs = 900000, maxKeys = 10000) {
  const entries = new Map();
  return (key, cost = 1) => {
    const now = Date.now();
    for (const [k, v] of entries) if (v.until <= now) entries.delete(k);
    let entry = entries.get(key);
    if (!entry) { if (entries.size >= maxKeys) return false; entry = { count: 0, until: now + windowMs }; entries.set(key, entry); }
    if (entry.count + cost > limit) return false;
    entry.count += cost; return true;
  };
}
module.exports = { security, safeError, budget };
