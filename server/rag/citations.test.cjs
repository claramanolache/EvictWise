const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sourceFromRow,addCitationLinks}=require('./citations.cjs');
const row={file:'law.pdf',page:2,part:1,text:'Source: Official law\nURL: https://example.gov/law(section)\nJurisdiction: California\n\nLaw text'};
test('citations use original URLs with readable source metadata',()=>{
 const source=sourceFromRow(row,0);
 assert.equal(source.title,'Official law');
 assert.equal(addCitationLinks('Rule [S1].',[source]),'Rule [S1](<https://example.gov/law(section)>).');
 assert.equal(source.page,2);
});
test('model-authored citation URLs are replaced; unsafe source schemes cannot become links',()=>{
 const source=sourceFromRow(row,0);
 assert.equal(addCitationLinks('Rule [S1](https://fake.example).',[source]),'Rule [S1](<https://example.gov/law(section)>).');
 for(const url of ['javascript:alert(1)','file:///secret','https://user:password@example.gov']) {
  const local=sourceFromRow({...row,text:`Source: Local\nURL: ${url}\n\nLaw`},0);
  assert.equal(local.url,null);
  assert.equal(addCitationLinks('[S1]',[local]),'[S1](<evictwise-source:S1>)');
 }
 assert.throws(()=>addCitationLinks('[S99]',[source]),/Unknown/);
});
