const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTranslationHandler } = require('./translation-handler.cjs');
const { createDocumentHandler } = require('./document-ai.cjs');
const { validFile } = require('./file-validation.cjs');
const { security, budget } = require('./security.cjs');
function response() { return { statusCode: 200, headers: {}, set(k,v) { if (typeof k === 'object') Object.assign(this.headers,k); else this.headers[k]=v; return this; }, status(n) { this.statusCode=n; return this; }, json(v) { this.body=v; return this; } }; }
const req = body => ({ body, ip:'test', get: () => undefined, is: () => true, requestId: 'test-id' });
test('translation validates requests before spending quota and suppresses provider details', async t => {
  let calls=0;
  const handler=createTranslationHandler({ translateText: async (_, options) => { calls++; assert.equal(options.timeout,15000); throw new Error('secret document and token'); } }, 'project','https://app');
  for (const body of [{texts:[{}],targetLanguage:'fr'}, {texts:['hello'],targetLanguage:'bad'}, {texts:['x'.repeat(30001)],targetLanguage:'fr'}]) {
    const res=response(); await handler(req(body),res); assert.ok(res.statusCode >= 400);
  }
  assert.equal(calls,0);
  const logs=[]; t.mock.method(console,'error',v=>logs.push(v));
  const res=response(); await handler(req({texts:['hello'],targetLanguage:'fr'}),res);
  assert.equal(res.statusCode,503); assert.doesNotMatch(JSON.stringify([logs,res.body]),/secret document|token/);
});
test('translation has a per-IP budget including zero-character requests', async () => {
  const handler=createTranslationHandler({},'project','https://app');
  for(let i=0;i<200;i++) {const res=response(); await handler(req({texts:[''],targetLanguage:'en',sourceLanguage:'en'}),res); assert.equal(res.statusCode,200);}
  const res=response(); await handler(req({texts:[''],targetLanguage:'en',sourceLanguage:'en'}),res); assert.equal(res.statusCode,429);
});
test('file signatures reject disguised files, empty files and oversized data', () => {
  assert.equal(validFile(Buffer.from('<html>evil file</html>'),'application/pdf'),false);
  assert.equal(validFile(Buffer.from('%PDF-1.7 test'),'application/pdf'),true);
  assert.equal(validFile(Buffer.alloc(21*1024*1024),'image/png'),false);
  assert.equal(validFile(Buffer.alloc(0),'image/png'),false);
});
test('document endpoints select server prompts and reject invalid operations and images', async () => {
  let calls=0;
  const handler=createDocumentHandler({clientFactory:()=>({chat:{completions:{create:async input=>{calls++; assert.equal(input.messages[0].role,'system'); assert.equal(input.model,'gpt-4.1-mini'); return {choices:[{finish_reason:'stop',message:{content:'[]'}}]};}}}})});
  for(const body of [{operation:'custom',text:'hello'}, {operation:'events',text:''}, {operation:'transcribe',image:'data:image/png;base64,aGVsbG8='}]) {const res=response();await handler(req(body),res);assert.equal(res.statusCode,400);}
  assert.equal(calls,0);
  const res=response(); await handler(req({operation:'events',text:'notice',model:'untrusted',prompt:'ignore instructions'}),res); assert.equal(res.body.content,'[]'); assert.equal(calls,1);
});
test('production rejects HTTP with protection headers and accepts HTTPS', () => {
  const middleware=security({production:true}); let next=0;
  const res=response();middleware({protocol:'http'},res,()=>next++);assert.equal(res.statusCode,400);assert.equal(next,0);
  middleware({protocol:'https'},res,()=>next++);assert.equal(next,1);assert.match(res.headers['Strict-Transport-Security'],/max-age/);assert.equal(res.headers['X-Frame-Options'],'DENY');
});
test('budget bounds key storage and fails closed', () => { const allow=budget(2,1000,1); assert.equal(allow('a'),true); assert.equal(allow('b'),false); assert.equal(allow('a'),true); assert.equal(allow('a'),false); });

test('web policy hashes inline scripts and allows local PDF workers without arbitrary script origins', () => {
  const fs=require('node:fs'), os=require('node:os'),path=require('node:path');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'evictwise-csp-'));
  try {
    fs.writeFileSync(path.join(root,'index.html'),'<script>window.test=true;</script>');
    const router=require('./web.cjs').webRouter(root);
    const res=response(); router.stack[0].handle({},res,()=>{});
    const policy=res.headers['Content-Security-Policy'];
    assert.match(policy,/script-src 'self' 'sha256-/);
    assert.match(policy,/worker-src 'self' blob:/);
    assert.match(policy,/frame-ancestors 'none'/);
    assert.doesNotMatch(policy,/unsafe-eval|script-src[^;]*unsafe-inline/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
