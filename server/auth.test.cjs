const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { mkdtempSync, rmSync, statSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createAuthRouter } = require('./auth.cjs');
const password = 'A unique test passphrase 2026!';
async function setup(t, options = {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'evictwise-auth-'));
  const databasePath = path.join(directory, 'private/accounts.sqlite3');
  let time = Date.now();
  const auth = createAuthRouter({ databasePath, now: () => time, ...options });
  const app = express(); app.use(express.json()); app.use('/api/auth', auth.router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); auth.close(); rmSync(directory, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${server.address().port}/api/auth/`;
  return { databasePath, advance: ms => { time += ms; }, async request(route, body, headers = {}) {
    const response = await fetch(url + route, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie'), cache: response.headers.get('cache-control') };
  } };
}
test('registration, session restoration, logout, login, and expiry; secrets stay server-side', async t => {
  const h = await setup(t);
  assert.equal((await h.request('session')).status, 401);
  const signup = await h.request('register', { username: 'Tenant_One', password, language: 'es' });
  assert.equal(signup.status, 200);
  assert.equal(signup.data.user.username, 'tenant_one');
  assert.equal(signup.data.user.preferredLanguage, 'es');
  assert.equal(signup.data.token, undefined);
  assert.match(signup.cookie, /HttpOnly/); assert.match(signup.cookie, /SameSite=Lax/);
  assert.equal(signup.cache, 'no-store');
  const Cookie = signup.cookie.split(';')[0];
  assert.equal((await h.request('session', undefined, { Cookie })).data.user.id, signup.data.user.id);
  const db = new DatabaseSync(h.databasePath, { readOnly: true });
  const row = db.prepare('SELECT * FROM accounts').get();
  assert.match(row.password_hash, /^pbkdf2-sha256\$600000\$[0-9a-f]{64}$/); assert.equal(row.salt.length, 32);
  assert.ok(!JSON.stringify(row).includes(password));
  assert.notEqual(db.prepare('SELECT token_hash FROM sessions').get().token_hash, Cookie.split('=')[1]);
  db.close();
  assert.equal(statSync(h.databasePath).mode & 0o777, 0o600);
  assert.equal(statSync(path.dirname(h.databasePath)).mode & 0o777, 0o700);
  assert.equal((await h.request('logout', {}, { Cookie })).status, 200);
  assert.equal((await h.request('session', undefined, { Cookie })).status, 401);
  assert.equal((await h.request('login', { username: 'tenant_one', password: 'incorrect passphrase' })).status, 401);
  const login = await h.request('login', { username: 'TENANT_ONE', password });
  assert.equal(login.status, 200);
  assert.notEqual(login.cookie.split(';')[0], Cookie);
  h.advance(8 * 24 * 60 * 60 * 1000);
  assert.equal((await h.request('session', undefined, { Cookie: login.cookie.split(';')[0] })).status, 401);
});
test('unique salts, duplicate usernames, input policy, and parameterized account lookup', async t => {
  const h = await setup(t);
  assert.equal((await h.request('register', { username: 'short', password: 'short', language: 'en' })).status, 400);
  assert.equal((await h.request('register', { username: "user' OR 1=1--", password })).status, 400);
  assert.equal((await h.request('register', { username: 'wrong_language', password, language: 'invalid' })).status, 400);
  assert.equal((await h.request('register', { username: 'first_user', password })).status, 200);
  assert.equal((await h.request('register', { username: 'second_user', password })).status, 200);
  assert.equal((await h.request('register', { username: 'FIRST_USER', password })).status, 409);
  const db = new DatabaseSync(h.databasePath, { readOnly: true });
  const rows = db.prepare('SELECT salt,password_hash FROM accounts').all();
  assert.equal(rows.length, 2); assert.notEqual(rows[0].salt, rows[1].salt); assert.notEqual(rows[0].password_hash, rows[1].password_hash);
  db.close();
});
test('cross-origin writes, non-JSON requests, excessive attempts and production HTTP are rejected', async t => {
  const h = await setup(t);
  assert.equal((await h.request('register', { username: 'tenant', password }, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await h.request('register', { username: 'tenant', password }, { 'Content-Type': 'text/plain' })).status, 415);
  for (let i = 0; i < 30; i++) await h.request('login', { username: '', password: '' });
  assert.equal((await h.request('login', { username: 'tenant', password })).status, 429);
  const production = await setup(t, { production: true });
  assert.equal((await production.request('register', { username: 'tenant', password })).status, 400);
});
test('native clients receive a session token that authenticates and is revoked on logout', async t => {
  const h = await setup(t);
  const signup = await h.request('register', { username: 'native_tenant', password }, { 'X-Client-Platform': 'native' });
  assert.equal(signup.data.token.length, 64);
  const Authorization = `Bearer ${signup.data.token}`;
  assert.equal((await h.request('session', undefined, { Authorization })).status, 200);
  await h.request('logout', {}, { Authorization });
  assert.equal((await h.request('session', undefined, { Authorization })).status, 401);
});


test('registration rejects eight characters and accepts nine characters', async t => {
  const h = await setup(t);
  const short = await h.request('register', { username: 'boundary_user', password: '12345678' });
  assert.equal(short.status, 400);
  assert.equal(short.data.error, 'authPasswordPolicy');
  const accepted = await h.request('register', { username: 'boundary_user', password: 'ninechars' });
  assert.equal(accepted.status, 200);
});

test('RAG chat requires a session before accessing knowledge or generation', async t => {
  const h = await setup(t);
  assert.equal((await h.request('chat', { messages: [{ role: 'user', content: 'Help' }] })).status, 401);
});

 test('document AI requires authentication, validates payloads and rejects logged-out sessions', async t => {
   const h = await setup(t);
   assert.equal((await h.request('document-ai', { operation: 'events', text: 'hello' })).status, 401);
   const signup = await h.request('register', { username: 'document_user', password });
   const Cookie = signup.cookie.split(';')[0];
   assert.equal((await h.request('document-ai', { operation: 'custom' }, { Cookie })).status, 400);
   await h.request('logout', {}, { Cookie });
   assert.equal((await h.request('document-ai', { operation: 'events', text: 'hello' }, { Cookie })).status, 401);
 });

test('legacy scrypt accounts migrate only after a correct login and keep their account identity', async t => {
  const h = await setup(t);
  const { scryptSync, pbkdf2Sync } = require('node:crypto');
  const salt = '0123456789abcdef0123456789abcdef';
  const oldHash = scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }).toString('hex');
  const db = new DatabaseSync(h.databasePath);
  try {
    db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?)').run('legacy-id', 'legacy_user', oldHash, salt, 'es', Date.now());
    assert.equal((await h.request('login', { username: 'legacy_user', password: 'incorrect' })).status, 401);
    assert.equal(db.prepare('SELECT password_hash FROM accounts WHERE id=?').get('legacy-id').password_hash, oldHash);
    const login = await h.request('login', { username: 'legacy_user', password });
    assert.equal(login.status, 200);
    assert.equal(login.data.user.id, 'legacy-id');
    assert.equal(login.data.user.preferredLanguage, 'es');
    const row = db.prepare('SELECT * FROM accounts WHERE id=?').get('legacy-id');
    assert.match(row.password_hash, /^pbkdf2-sha256\$600000\$[0-9a-f]{64}$/);
    assert.notEqual(row.salt, salt);
    const expected = pbkdf2Sync(password, Buffer.from(row.salt, 'hex'), 600000, 32, 'sha256').toString('hex');
    assert.equal(row.password_hash, 'pbkdf2-sha256$600000$' + expected);
    assert.equal((await h.request('session', undefined, { Cookie: login.cookie.split(';')[0] })).data.user.id, 'legacy-id');
    assert.equal((await h.request('login', { username: 'legacy_user', password })).status, 200);
    assert.equal(db.prepare('SELECT password_hash FROM accounts WHERE id=?').get('legacy-id').password_hash, row.password_hash);
  } finally { db.close(); }
});

test('unknown accounts and malformed stored hashes are rejected without issuing a session', async t => {
  const h = await setup(t);
  assert.equal((await h.request('login', { username: 'missing_user', password })).status, 401);
  const db = new DatabaseSync(h.databasePath);
  try { db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?)').run('malformed-id', 'malformed_user', 'pbkdf2-sha256$1$abcd', 'invalid', 'en', Date.now()); }
  finally { db.close(); }
  const result = await h.request('login', { username: 'malformed_user', password });
  assert.equal(result.status, 401);
  assert.equal(result.cookie, null);
});
