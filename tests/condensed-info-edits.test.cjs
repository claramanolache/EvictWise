const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const output = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/condensedInfoEdits.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: output });
const report = 'User Name: Jane\nLocation: Oakland\nHousing Location/Type: Apartment\nDeadlines:\n- 2026-11-01: Hearing\nLegal reason for eviction: Unpaid rent\n\nAdditional Info (from chatbox conversation)\n- User reports: Has receipts.\n';

test('extracts all editable fields including multiline deadlines and chat details', () => {
  const fields = output.readReportFields(report);
  assert.equal(fields.userName, 'Jane');
  assert.equal(fields.deadlines, '- 2026-11-01: Hearing');
  assert.equal(fields.evictionReason, 'Unpaid rent');
  assert.equal(fields.additionalInfo, '- User reports: Has receipts.');
});
test('saved field edits survive regenerated data while untouched fields update', () => {
  const updated = report.replace('Oakland', 'Berkeley').replace('Has receipts.', 'Has receipts and bank records.');
  const merged = output.applyReportEdits(updated, { userName: 'Jane Smith', evictionReason: 'Disputed unpaid rent' });
  assert.match(merged, /User Name: Jane Smith/);
  assert.match(merged, /Location: Berkeley/);
  assert.match(merged, /Legal reason for eviction: Disputed unpaid rent/);
  assert.match(merged, /Has receipts and bank records/);
});
test('empty edits explicitly clear a field and no edits preserve the report exactly', () => {
  assert.equal(output.applyReportEdits(report), report);
  const merged = output.readReportFields(output.applyReportEdits(report, { additionalInfo: '' }));
  assert.equal(merged.additionalInfo, '');
  assert.equal(merged.userName, 'Jane');
});
