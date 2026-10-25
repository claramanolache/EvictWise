const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const express = require('express');
// Serve an Expo static export behind the same HTTPS reverse proxy as the API.
function webRouter(directory) {
  const root = path.resolve(directory);
  const hashes = new Set();
  for (const item of fs.readdirSync(root, { recursive: true })) {
    if (!item.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(root, item), 'utf8');
    for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
      if (match[1]) hashes.add(`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
    }
  }
  const policy = ["default-src 'self'", `script-src 'self' ${[...hashes].join(' ')}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' blob: data:", "font-src 'self' data:", "connect-src 'self' blob: https://nominatim.openstreetmap.org", "worker-src 'self' blob:", "frame-src blob:", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
  const router = express.Router();
  router.use((req, res, next) => { res.set('Content-Security-Policy', policy); next(); });
  router.use(express.static(root, { extensions: ['html'], dotfiles: 'deny', index: 'index.html' }));
  return router;
}
module.exports = { webRouter };
