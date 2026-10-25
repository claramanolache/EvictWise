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
  assert.deepEqual(await health.json(), { ok: true, capabilities: { ragChat: true } });
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

test('API routing and parser errors are JSON, and Unicode requests fit the context budget',async t=>{
 const {app}=loadServer();const url=await serve(t,app);
 for(const [body,status] of [['{',400],[JSON.stringify({text:'中'.repeat(54000)}),404],[JSON.stringify({text:'x'.repeat(320000)}),413]]) {
  const response=await fetch(`${url}/api/missing`,{method:'POST',headers:{'Content-Type':'application/json'},body});
  assert.equal(response.status,status);assert.match(response.headers.get('content-type'),/application\/json/);
  assert.equal(typeof (await response.json()).error,'string');
 }
});

test('production web export and API share HTTPS enforcement and distinct CSP policies', async t => {
  const directory=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'evictwise-web-'));
  fs.writeFileSync(path.join(directory,'index.html'),'<html><script>window.example=true;</script><body>Evict Wise</body></html>');
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const {app}=loadServer({NODE_ENV:'production',TRUST_PROXY_HOPS:'1',WEB_DIST:directory,CLIENT_ORIGIN:'https://example.test'});
  const url=await serve(t,app);
  assert.equal((await fetch(url)).status,400);
  const response=await fetch(url,{headers:{'X-Forwarded-Proto':'https'}});
  assert.equal(response.status,200);
  assert.match(await response.text(),/Evict Wise/);
  assert.match(response.headers.get('content-security-policy'),/script-src 'self' 'sha256-/);
  assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.equal(response.headers.get('x-powered-by'),null);
  const api=await fetch(url+'/api/health',{headers:{'X-Forwarded-Proto':'https'}});
  assert.match(api.headers.get('content-security-policy'),/default-src 'none'/);
});
