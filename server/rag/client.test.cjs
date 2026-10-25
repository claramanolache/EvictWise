const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient, EMBEDDING_MODEL, CHAT_MODEL } = require('./client.cjs');
const { embed, DB_PATH } = require('./index.cjs');
test('Gemini requests use Google endpoint and supplied key for embeddings and generation', async () => {
  const requests = [];
  const client = createClient({ apiKey: 'test-gemini-key', fetch: async (url, init) => {
    requests.push({url:String(url), headers:new Headers(init.headers), body:JSON.parse(init.body)});
    return new Response(JSON.stringify(String(url).endsWith('/embeddings') ? {data:[{embedding:[1,0]}]} : {choices:[{message:{content:'test'}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  }});
  assert.deepEqual(await embed(client,['source text']),[[1,0]]);
  await client.chat.completions.create({model:CHAT_MODEL,messages:[{role:'user',content:'question'}]});
  for(const request of requests) {
    assert.equal(new URL(request.url).hostname,'generativelanguage.googleapis.com');
    assert.equal(request.headers.get('authorization'),'Bearer test-gemini-key');
  }
  assert.equal(requests[0].body.model,EMBEDDING_MODEL);
  assert.match(DB_PATH,/legal-index-gemini\.sqlite3$/);
});
test('missing Gemini key fails explicitly without falling back to OpenAI',()=>{
  assert.throws(()=>createClient({apiKey:''}),/GEMINI_API_KEY/);
});

test('embedding validator still rejects duplicate indexes',async()=>{
  await assert.rejects(embed({embeddings:{create:async()=>({data:[{embedding:[1,0]},{embedding:[0,1]}]})}},['one','two']),/Incomplete embeddings/);
});

test('chat retries the primary on temporary failure but never on invalid credentials',async()=>{
  const {generate,CHAT_MODEL}=require('./client.cjs');
  const requests=[];
  const client={chat:{completions:{create:async request=>{
    requests.push(request);
    if(requests.length===1)throw Object.assign(Error('overload'),{status:503});
    return {ok:true};
  }}}};
  assert.deepEqual(await generate(client,{messages:[]},{wait:async()=>{}}),{ok:true});
  assert.equal(requests[0].model,CHAT_MODEL);assert.equal(requests[1].model,CHAT_MODEL);
  let calls=0;
  client.chat.completions.create=async()=>{calls++;throw Object.assign(Error('invalid key'),{status:401});};
  await assert.rejects(generate(client,{}),/invalid key/);assert.equal(calls,1);
});

test('index quota retries are bounded, respect retry delay and do not retry authentication',async()=>{
  const {withQuotaRetry}=require('./retry.cjs');let calls=0;const waits=[];
  const result=await withQuotaRetry(async()=>{if(++calls<3)throw Object.assign(Error('Please retry in 2.5s.'),{status:429});return 'ok';},{wait:async ms=>waits.push(ms),log:()=>{}});
  assert.equal(result,'ok');assert.deepEqual(waits,[3000,3000]);
  calls=0;await assert.rejects(withQuotaRetry(async()=>{calls++;throw Object.assign(Error('auth'),{status:401});},{wait:async()=>{},log:()=>{}}),/auth/);assert.equal(calls,1);
});


test('real SDK connection and timeout errors trigger bounded recovery', async () => {
  const { APIConnectionError, APIConnectionTimeoutError } = require('openai');
  const { generate, isTransient, CHAT_MODEL } = require('./client.cjs');
  for (const error of [new APIConnectionError({}), new APIConnectionTimeoutError()]) {
    assert.equal(error.name, 'Error'); // SDK does not use the class name here.
    assert.equal(isTransient(error), true);
    const calls = [];
    const client = { chat: { completions: { create: async (request, options) => {
      calls.push(request.model);
      assert.equal(options.timeout, 30000);
      throw error;
    } } } };
    await assert.rejects(generate(client, {}, { wait: async () => {} }), e => e === error);
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.slice(0, 2), [CHAT_MODEL, CHAT_MODEL]);
    assert.notEqual(calls[2], CHAT_MODEL);
  }
});

test('quota skips primary retry and fallback can recover', async () => {
  const { generate, CHAT_MODEL } = require('./client.cjs');
  const calls = [];
  const client = { chat: { completions: { create: async request => {
    calls.push(request.model);
    if (calls.length === 1) throw Object.assign(Error('quota'), {status:429});
    return {ok:true};
  } } } };
  assert.deepEqual(await generate(client, {}, { wait: async () => assert.fail('quota must not retry primary') }), {ok:true});
  assert.equal(calls.length, 2);
  assert.equal(calls[0], CHAT_MODEL);
  assert.notEqual(calls[1], CHAT_MODEL);
});
