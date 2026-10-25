const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function client(fetch){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/auth/api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,require:()=>({Platform:{OS:'web'}}),process:{env:{}},fetch,AbortController,Error,TypeError,setTimeout,clearTimeout});return exports;
}
test('document requests report actionable safe errors by HTTP status',async()=>{
 for(const [status,key] of [[404,'documentServiceOutdated'],[401,'documentSignInRequired'],[429,'documentRateLimited'],[413,'documentTooLarge'],[503,'documentServiceUnavailable']]){
  const api=client(async()=>({ok:false,status,json:async()=>({error:'private provider details'})}));
  await assert.rejects(api.documentRequest({operation:'events',text:'test'}),error=>error.message===key);
 }
});
test('document request sends the session and recognizes unavailable and timed-out services',async()=>{
 const api=client(async(url,options)=>{assert.match(url,/\/api\/auth\/document-ai$/);assert.equal(options.credentials,'include');return {ok:true,json:async()=>({content:'[]'})};});
 assert.equal(await api.documentRequest({operation:'events',text:'test'}),'[]');
 await assert.rejects(client(async()=>{throw new TypeError('Failed to fetch');}).documentRequest({operation:'events',text:'test'}),/documentServiceUnavailable/);
 await assert.rejects(client(async()=>{const error=new Error('abort');error.name='AbortError';throw error;}).documentRequest({operation:'events',text:'test'}),/documentRequestTimedOut/);
});
