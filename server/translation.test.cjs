const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadServer(env = {}) {
  let config;
  const module = { exports: {} };
  const directory = __dirname;
  vm.runInNewContext(fs.readFileSync(path.join(directory, 'index.js'), 'utf8'), {
    __dirname: directory,
    module,
    console,
    process: { env },
    require(name) {
      if (name === 'dotenv') return { config(options) { config = options; } };
      if (name === '@google-cloud/translate') return {
        TranslationServiceClient: class {
          async translateText() {
            return [{ translations: [{ translatedText: 'Bonjour', detectedLanguageCode: 'en' }] }];
          }
        },
      };
      return require(name);
    },
  });
  return { app: module.exports, config };
}

async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('loads server/.env independent of cwd and allows Expo preflight', async t => {
  const { app, config } = loadServer();
  assert.equal(config.path, path.join(__dirname, '.env'));
  const url = await serve(t, app);
  const health = await fetch(`${url}/api/health`);
  assert.deepEqual(await health.json(), { ok: true });
  const preflight = await fetch(`${url}/api/translate`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  assert.match(preflight.headers.get('access-control-allow-headers'), /content-type/);
});

test('configured origin and Google response survive the HTTP round trip', async t => {
  const { app } = loadServer({ GOOGLE_CLOUD_PROJECT: 'test-project', CLIENT_ORIGIN: 'http://localhost:8082' });
  const url = await serve(t, app);
  const response = await fetch(`${url}/api/translate`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:8082', 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: ['Hello'], targetLanguage: 'fr' }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8082');
  assert.equal((await response.json()).translations[0].translatedText, 'Bonjour');
});

test('client distinguishes connection failures from API errors', async t => {
  const source = fs.readFileSync(path.join(__dirname, '../src/Translation/translate.js'), 'utf8');
  const client = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const networkError = new TypeError('Failed to fetch');
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw networkError; });
  await assert.rejects(client.translateText({ text: 'Hello', targetLanguage: 'fr' }), error => {
    assert.match(error.message, /npm run server/);
    assert.equal(error.cause, networkError);
    return true;
  });
  mock.mock.mockImplementation(async () => ({ ok: false, json: async () => ({ error: 'Google credentials missing' }) }));
  await assert.rejects(client.translateText({ text: 'Hello', targetLanguage: 'fr' }), /Google credentials missing/);
  mock.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ translations: [{ translatedText: 'Bonjour' }] }) }));
  assert.equal(await client.translateText({ text: 'Hello', targetLanguage: 'fr' }), 'Bonjour');
});
