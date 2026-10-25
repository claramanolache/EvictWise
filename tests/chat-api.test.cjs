const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function client(response) {
 const exports={};
 const code=ts.transpileModule(fs.readFileSync('src/auth/api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:()=>({Platform:{OS:'web'}}),process:{env:{}},AbortController,setTimeout,clearTimeout,Error,fetch:async()=>response});
 return exports;
}
test('HTML missing chat route produces actionable error instead of JSON syntax error',async()=>{
 const api=client(new Response('<!DOCTYPE html><pre>Cannot POST /api/auth/chat</pre>',{status:404,headers:{'content-type':'text/html'}}));
 await assert.rejects(api.chatRequest({messages:[],profileContext:''}),/Restart the API/);
});
test('valid JSON chat responses still work',async()=>{
 const api=client(new Response(JSON.stringify({content:'Answer',sources:[]}),{headers:{'content-type':'application/json'}}));
 assert.equal((await api.chatRequest({messages:[],profileContext:''})).content,'Answer');
});
