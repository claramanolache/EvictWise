const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { unzipSync, strFromU8 } = require('fflate');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/utils/${file}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => mocks[name] ?? require(name), ...globals });
  return exports;
}
const { buildCaseArchive, MissingCaseFileError } = load('caseArchive');
test('ZIP preserves binary originals, repeated names, and safe numbered entry order', async () => {
  const bytes = Uint8Array.from([0, 255, 1, 17, 128]);
  const names = ['../../case-summary.txt', 'proof.pdf', 'proof.pdf', 'C:\\secret\\image.jpg'];
  const archive = await buildCaseArchive('English summary é', names.map((name, i) => ({ name, originalFileId: String(i) })), async () => bytes);
  const files = unzipSync(archive);
  assert.deepEqual(Object.keys(files), ['0000-case-summary.txt', '0001-case-summary.txt', '0002-proof.pdf', '0003-proof.pdf', '0004-image.jpg']);
  assert.equal(strFromU8(files['0000-case-summary.txt']), 'English summary é');
  for (const name of Object.keys(files).slice(1)) assert.deepEqual(files[name], bytes);
  // First local ZIP entry, independently of central-directory enumeration.
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(strFromU8(archive.slice(30, 30 + view.getUint16(26, true))), '0000-case-summary.txt');
});
test('legacy or unreadable originals reject instead of producing a partial archive', async () => {
  await assert.rejects(buildCaseArchive('Report', [{ name: 'legacy.pdf' }], async () => new Uint8Array()), error => error instanceof MissingCaseFileError && error.fileName === 'legacy.pdf');
  await assert.rejects(buildCaseArchive('Report', [{ name: 'lost.pdf', originalFileId: 'id' }], async () => { throw Error('missing'); }), MissingCaseFileError);
  await assert.rejects(buildCaseArchive('', [], async () => new Uint8Array()));
});
test('empty upload collection still produces a valid summary archive', async () => {
  const files = unzipSync(await buildCaseArchive('Report', [], async () => { throw Error('unexpected read'); }));
  assert.deepEqual(Object.keys(files), ['0000-case-summary.txt']);
});
test('native archive uses ZIP file sharing and removes the temporary export', async () => {
  const actions = [];
  class File {
    exists = false;
    uri = 'file:///cache/case.zip';
    create() { this.exists = true; actions.push('create'); }
    write(bytes) { actions.push(Array.from(bytes)); }
    delete() { this.exists = false; actions.push('delete'); }
  }
  const { downloadCaseArchive } = load('downloadCaseArchive', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-file-system': { File, Paths: { cache: 'cache' } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (uri, options) => { assert.equal(uri, 'file:///cache/case.zip'); assert.equal(options.mimeType, 'application/zip'); actions.push('share'); } },
  });
  await downloadCaseArchive(Uint8Array.of(1, 2));
  assert.deepEqual(actions, ['create', [1, 2], 'share', 'delete']);
});
