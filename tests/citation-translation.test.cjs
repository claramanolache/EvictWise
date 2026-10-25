const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/citationTranslation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:output});
test('translation preserves original citation destinations verbatim',()=>{
 const prepared=output.protectCitationLinks('Rule [S1](<https://example.gov/law>). Another [S2](<evictwise-source:S2>).');
 assert(!prepared.text.includes('https://'));
 assert.equal(prepared.restore(prepared.text.replace('Rule','Regla')),'Regla [S1](<https://example.gov/law>). Another [S2](<evictwise-source:S2>).');
 assert.throws(()=>prepared.restore('Missing citations'),/changed a source citation/);
});
