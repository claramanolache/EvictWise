const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const output = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/chatProfileContext.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: output });
const parse = profile => JSON.parse(output.buildChatProfileContext(profile).split('\n').slice(1).join('\n'));

test('includes current eviction, tenant/lease, location, and deadline information', () => {
  const data = parse({
    location: { city: 'Oakland', state: 'CA', country: 'USA' },
    evictionNotice: { name: 'notice.pdf', markdown: 'Reason: unpaid rent', originalFileId: 'private-local-reference' },
    leaseAgreement: { name: 'lease.pdf', markdown: 'Tenant: Jane Doe; dwelling: apartment' },
    events: [{ name: 'Hearing', date: [2026, 0, 15], document: 'eviction' }],
  });
  assert.equal(data.location.city, 'Oakland');
  assert.equal(data.evictionNotice.extractedText, 'Reason: unpaid rent');
  assert.match(data.leaseAgreement.extractedText, /Jane Doe/);
  assert.equal(data.extractedDeadlines[0].date, '2026-01-15');
  assert.equal(data.evictionNotice.originalFileId, undefined);
});
test('missing data stays unknown and metadata-only attachments do not imply readable text', () => {
  const data = parse({ location: null, evictionNotice: null, leaseAgreement: null, events: [], additionalFiles: [{ name: 'notes.docx', markdown: '' }] });
  assert.equal(data.evictionNotice, null);
  assert.equal(data.additionalDocuments[0].extractedText, null);
});
test('subsequent calls reflect profile edits instead of retaining old document data', () => {
  const profile = { location: null, evictionNotice: { name: 'old.pdf', markdown: 'Old' }, leaseAgreement: null, events: [] };
  assert.equal(parse(profile).evictionNotice.extractedText, 'Old');
  profile.evictionNotice = { name: 'new.pdf', markdown: 'Updated' };
  assert.equal(parse(profile).evictionNotice.extractedText, 'Updated');
});

test('large context keeps parseable JSON, both primary documents and deadline metadata',()=>{
 const profile={location:{city:'Palo Alto',state:'CA'},evictionNotice:{name:'notice.pdf',markdown:'N'.repeat(50000)},leaseAgreement:{name:'lease.pdf',markdown:'L'.repeat(50000)},additionalFiles:Array.from({length:20},()=>({name:'extra.txt',markdown:'X'.repeat(10000)})),events:[{name:'Hearing',date:[2026,0,15],document:'eviction'}]};
 const text=output.buildChatProfileContext(profile);assert(text.length<=24000);
 const data=JSON.parse(text.split('\n').slice(1).join('\n'));
 assert.equal(data.contextTruncated,true);assert.equal(data.location.city,'Palo Alto');
 assert(data.evictionNotice.extractedText);assert(data.leaseAgreement.extractedText);
 assert.equal(data.extractedDeadlines[0].name,'Hearing');
 assert.equal(profile.evictionNotice.markdown.length,50000);
});
