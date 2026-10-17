const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const output = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/condensedUserInfo.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: output });

test('missing fields follow the requested five-line format without inventing facts', () => {
  assert.equal(output.formatUserInfo({ userName: '', housingLocationType: '', evictionReason: '' }, null, []),
    'User Name: Not provided\nLocation: Not provided\nHousing Location/Type: Not provided\nDeadlines: Not provided\nLegal reason for eviction: Not provided\n\nAdditional Info (from chatbox conversation)\nNot provided\n');
});
test('includes location, extracted details and chronological deadlines without mutating stored events', () => {
  const events = [
    { date: [2026, 11, 2], name: 'Hearing', document: 'eviction' },
    { date: [2026, 0, 1], name: 'Rent', document: 'lease' },
  ];
  const report = output.formatUserInfo({ userName: 'Jane Doe', housingLocationType: '10 Main St / Apartment', evictionReason: 'Notice states unpaid rent' }, { city: 'Oakland', state: 'CA', country: 'USA', zipCode: '94612' }, events);
  assert.match(report, /User Name: Jane Doe/);
  assert.match(report, /Location: Oakland, CA, USA, 94612/);
  assert.match(report, /Housing Location\/Type: 10 Main St \/ Apartment/);
  assert.ok(report.indexOf('2026-01-01') < report.indexOf('2026-12-02'));
  assert.match(report, /Legal reason for eviction: Notice states unpaid rent/);
  assert.equal(events[0].name, 'Hearing');
});
test('rejects missing or incorrectly typed extraction fields', () => {
  assert.throws(() => output.parseUserInfoDetails('{"userName": 12}'));
  assert.throws(() => output.parseUserInfoDetails('null'));
  assert.equal(output.parseUserInfoDetails('{"userName":"Jane","housingLocationType":"","evictionReason":""}').userName, 'Jane');
});


test('keeps the entire conversation under its subtitle with explicit role attribution', () => {
  const report = output.formatUserInfo({ userName: '', housingLocationType: '', evictionReason: '' }, null, [], [
    { role: 'assistant', content: 'When did you receive the notice?' },
    { role: 'user', content: 'October 12, by mail.' },
    { role: 'assistant', content: 'Ask legal aid to verify the deadline.' },
  ]);
  const [facts, chat] = report.split('Additional Info (from chatbox conversation)');
  assert.match(facts, /Legal reason for eviction: Not provided/);
  assert.doesNotMatch(facts, /Ask legal aid/);
  assert.match(chat, /User:\nOctober 12, by mail./);
  assert.match(chat, /AI response \(not verified\):\nAsk legal aid/);
  assert.ok(chat.indexOf('When did you') < chat.indexOf('October 12'));
});
