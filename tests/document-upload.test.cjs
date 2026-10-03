const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/hooks/useDocumentUpload.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function setup({ name = 'notice.pdf', mimeType = 'application/pdf', canceled = false, size = 100, fail = false, text = 'Rent due January 15, 2026', rawEvents, native = false } = {}) {
  const requests = [], actions = [], saves = [], states = [];
  let pickerOptions, parses = 0;
  const result = { canceled, assets: [{ name, mimeType, size, uri: 'file:///test-image', ...(native ? {} : { file: { name, size } }) }] };
  const mocks = {
    react: { useRef: current => ({ current }), useState: value => { const i = states.length; states.push(value); return [value, value => states[i] = value]; } },
    'react-redux': { useDispatch: () => action => actions.push(action) },
    'react-native': { Platform: { OS: native ? 'ios' : 'web' } },
    'expo-document-picker': { getDocumentAsync: async options => { pickerOptions = options; return result; } },
    'expo-file-system': { File: class { async base64() { return 'dGVzdA=='; } } },
    '@/pdf': { parsePdfToMarkdown: async () => { parses++; return text; } },
    '@/constants/assistantAI/prompt': { extractEventsPrompt: 'Extract events' },
    '@/slice': { clearEventsByDocument: document => ({ kind: 'clear', document }), addEvent: event => ({ kind: 'add', event }) },
    openai: class {
      chat = { completions: { create: async request => {
        requests.push(request);
        if (fail) throw new Error('API failure');
        const content = Array.isArray(request.messages[0].content) ? text : JSON.stringify(rawEvents ?? [{ date: [2026, 1, 15], deltaDays: 0, name: 'Rent', type: 'payment' }]);
        return { choices: [{ finish_reason: 'stop', message: { content } }] };
      } } };
    },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: name => mocks[name], process: { env: {} }, console,
    FileReader: class { readAsDataURL() { this.result = `data:${mimeType};base64,dGVzdA==`; this.onload(); } },
  });
  const hook = exports.useDocumentUpload();
  return { run: document => hook.upload(document, file => saves.push(file)), requests, actions, saves, states, options: () => pickerOptions, parses: () => parses };
}

test('PDF replacement preserves its name, extracts events, and uses zero-based calendar months', async () => {
  const h = setup(); await h.run('eviction');
  assert.equal(h.saves[0].name, 'notice.pdf');
  assert.equal(h.parses(), 1);
  assert.equal(h.actions[1].event.date[1], 0);
  assert.equal(h.actions[0].document, 'eviction');
});
for (const [name, mimeType] of [['lease.jpg', 'image/jpeg'], ['notice.png', 'image/png'], ['lease.webp', 'image/webp']]) {
  test(`transcribes ${mimeType} then extracts events and saves Markdown`, async () => {
    const h = setup({ name, mimeType }); await h.run('lease');
    assert.equal(h.parses(), 0);
    assert.equal(h.requests.length, 2);
    assert.match(h.requests[0].messages[0].content[1].image_url.url, /^data:image\//);
    assert.equal(h.requests[1].messages[1].content, h.saves[0].markdown);
    assert.equal(h.saves[0].name, name);
    assert.equal(h.actions[0].document, 'lease');
    assert.ok(h.options().type.includes(mimeType));
  });
}
test('native image asset works without a browser File object', async () => {
  const h = setup({ name: 'lease.png', mimeType: 'image/png', native: true }); await h.run('lease');
  assert.equal(h.saves.length, 1);
});
test('falls back to file extension when MIME type is missing', async () => {
  const h = setup({ name: 'LEASE.JPG', mimeType: '' }); await h.run('lease');
  assert.equal(h.requests.length, 2);
  assert.equal(h.saves.length, 1);
});
for (const [name, options] of [
  ['cancel', { canceled: true }],
  ['API failure', { fail: true }],
  ['unsupported format', { name: 'lease.heic', mimeType: 'image/heic' }],
  ['oversized image', { name: 'lease.png', mimeType: 'image/png', size: 21 * 1024 * 1024 }],
  ['unreadable image', { name: 'lease.png', mimeType: 'image/png', text: '' }],
  ['invalid extracted date', { rawEvents: [{ date: [2026, 2, 30], deltaDays: 0, name: 'Invalid', type: 'court' }] }],
]) {
  test(`${name} preserves existing document and calendar events`, async () => {
    const h = setup(options); await h.run('eviction');
    assert.equal(h.saves.length, 0);
    assert.equal(h.actions.length, 0);
    assert.equal(h.states[0], false);
    assert.equal(h.states[1], name !== 'cancel');
  });
}
