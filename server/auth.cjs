const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { hashPassword, verifyPassword, isLegacyHash } = require('./passwords.cjs');
const { mkdirSync, chmodSync, existsSync, openSync, closeSync } = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest('hex');
const languages = new Set(['en', 'es', 'fr', 'de', 'it', 'pt', 'ro', 'ja', 'ko', 'zh-CN']);

function createAuthRouter({ databasePath = process.env.AUTH_DATABASE_PATH || path.join(__dirname, 'private/accounts.sqlite3'), origin = process.env.CLIENT_ORIGIN || 'http://localhost:8081', production = process.env.NODE_ENV === 'production', now = Date.now } = {}) {
  if (databasePath !== ':memory:') {
    mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
    if (!existsSync(databasePath)) closeSync(openSync(databasePath, 'wx', 0o600));
    chmodSync(databasePath, 0o600);
  }
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, language TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);`);
  const router = express.Router();
  let hashing = 0;
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'lax', path: '/api/auth' };
  const publicUser = row => ({ id: row.id, username: row.username, preferredLanguage: row.language });
  function token(req) {
    const bearer = req.get('authorization');
    if (bearer?.startsWith('Bearer ')) return bearer.slice(7);
    return (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('evictwise_session='))?.slice(18);
  }
  function user(req) {
    const value = token(req);
    if (!value || value.length !== 64) return null;
    return db.prepare('SELECT accounts.* FROM accounts JOIN sessions ON accounts.id=sessions.account_id WHERE token_hash=? AND expires_at>?').get(digest(value), now());
  }
  function createSession(req, res, account) {
    const previous = token(req);
    if (previous) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(previous));
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now());
    const value = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(value), account.id, now() + SESSION_MS);
    res.cookie('evictwise_session', value, { ...cookieOptions, maxAge: SESSION_MS });
    res.json({ user: publicUser(account), ...(req.get('x-client-platform') === 'native' ? { token: value } : {}) });
  }
  function allowedAttempt(key, limit) {
    const time = now();
    db.prepare('DELETE FROM auth_attempts WHERE reset_at<=?').run(time);
    const row = db.prepare('SELECT count FROM auth_attempts WHERE key=?').get(key);
    if (row?.count >= limit) return false;
    db.prepare('INSERT INTO auth_attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, time + 15 * 60 * 1000);
    return true;
  }
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (production && req.protocol !== 'https') return res.status(400).json({ error: 'authHttpsRequired' });
    if (req.method !== 'GET' && (req.get('origin') && req.get('origin') !== origin)) return res.status(403).json({ error: 'authForbidden' });
    if (req.method !== 'GET' && !req.is('application/json')) return res.status(415).json({ error: 'authInvalidRequest' });
    next();
  });
  router.get('/session', (req, res) => {
    const account = user(req);
    if (!account) return res.status(401).json({ error: 'authSignInRequired' });
    res.json({ user: publicUser(account) });
  });
  router.post('/logout', (req, res) => {
    const value = token(req);
    if (value) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(value));
    res.clearCookie('evictwise_session', cookieOptions);
    res.json({ ok: true });
  });
  for (const mode of ['register', 'login']) router.post('/' + mode, async (req, res) => {
    const { username, password, language = 'en' } = req.body || {};
    if (!allowedAttempt('ip:' + digest(req.ip || 'unknown'), 30)) return res.status(429).json({ error: 'authTooManyAttempts' });
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(username) || typeof password !== 'string' || [...password].length > 128 || !password.length) return res.status(400).json({ error: 'authInvalidInput' });
    if (mode === 'register' && ([...password].length < 9 || !languages.has(language))) return res.status(400).json({ error: 'authPasswordPolicy' });
    const normalized = username.toLowerCase();
    if (!allowedAttempt('name:' + digest(normalized), 10) || hashing >= 2) return res.status(429).json({ error: 'authTooManyAttempts' });
    hashing++;
    try {
      const existing = db.prepare('SELECT * FROM accounts WHERE username=?').get(normalized);
      if (mode === 'login') {
        if (!await verifyPassword(password, existing)) return res.status(401).json({ error: 'authInvalidCredentials' });
        if (isLegacyHash(existing.password_hash)) {
          const upgraded = await hashPassword(password);
          db.prepare('UPDATE accounts SET password_hash=?, salt=? WHERE id=? AND password_hash=?')
            .run(upgraded.password_hash, upgraded.salt, existing.id, existing.password_hash);
        }
        createSession(req, res, existing);
      } else {
        const credentials = await hashPassword(password);
        if (existing) return res.status(409).json({ error: 'authUsernameUnavailable' });
        const account = { id: randomUUID(), username: normalized, language };
        db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?)').run(account.id, normalized, credentials.password_hash, credentials.salt, language, now());
        createSession(req, res, account);
      }
    } catch (error) {
      if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint/.test(error.message)) return res.status(409).json({ error: 'authUsernameUnavailable' });
      res.status(500).json({ error: 'authUnavailable' });
    } finally { hashing--; }
  });
  router.post('/document-ai', (req, res, next) => {
    const account = user(req);
    if (!account) return res.status(401).json({ error: 'Please sign in to process documents.' });
    if (!allowedAttempt('document:' + account.id, 40)) return res.status(429).json({ error: 'Document limit reached. Try again later.' });
    next();
  }, express.json({ limit: '28mb' }), require('./document-ai.cjs').createDocumentHandler());
  const chatHandler = require('./rag/chat.cjs').createChatHandler();
  router.post('/chat', (req, res, next) => {
    const account = user(req);
    if (!account) return res.status(401).json({ error: 'Please sign in to use chat.' });
    if (!allowedAttempt('chat:' + account.id, 60)) return res.status(429).json({ error: 'Chat limit reached. Please try again later.' });
    req.accountId = account.id;
    next();
  }, chatHandler);
  return { router, close: () => db.close() };
}
module.exports = { createAuthRouter };
