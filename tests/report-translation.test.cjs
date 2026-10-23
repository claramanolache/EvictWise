const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), ...globals });
  return exports;
}
const fields = load('utils/condensedInfoEdits.ts', {});
test('English normalization preserves canonical labels, names, and explicit empty edits', async () => {
  let request;
  const helper = load('utils/reportTranslation.ts', {
    './condensedInfoEdits': fields,
    '@/Translation/translate': { translateTexts: async value => { request = value; return [{ translatedText: 'I have receipts.' }]; } },
  });
  const edits = await helper.englishReportEdits({ userName: 'José', evictionReason: '', additionalInfo: 'Tengo recibos.' });
  assert.equal(request.targetLanguage, 'en');
  assert.equal(request.sourceLanguage, 'auto');
  assert.equal(edits.userName, 'José');
  assert.equal(edits.evictionReason, '');
  const report = await helper.englishReport('User Name: José\nAdditional Info (from chatbox conversation)\nTengo recibos.');
  assert.match(report, /User Name: José/);
  assert.match(report, /Additional Info \(from chatbox conversation\)\nI have receipts\./);
});
test('incomplete normalization rejects instead of saving untranslated edits', async () => {
  const helper = load('utils/reportTranslation.ts', { './condensedInfoEdits': fields, '@/Translation/translate': { translateTexts: async () => [] } });
  await assert.rejects(helper.englishReportEdits({ housing: 'Apartamento' }), /Incomplete English/);
});
function setup() {
  const slots = [], effects = [], requests = [], blobs = [];
  const data = { language: 'es', report: 'User Name: Pat\nLegal reason for eviction: Unpaid rent' };
  let cursor = 0;
  const translateMessage = (text, source, target) => new Promise((resolve, reject) => requests.push({ text, source, target, resolve, reject }));
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) { slots[i]?.cleanup?.(); effects.push(() => { slots[i] = { deps, cleanup: fn() }; }); } },
  };
  const component = load('components/CondensedUserInfo.tsx', {
    react: hooks, 'react-redux': { useDispatch: () => () => { throw Error('Display must not write Redux'); } },
    '@/slice': {}, '@/utils/condensedInfoEdits': fields, '@/utils/reportTranslation': {},
    '@/components/ThemedPressable': 'Button', '@/context/ThemeContext': { useAppColorScheme: () => 'dark' },
    '@/constants/theme': { getTheme: () => ({}) },
    '@/context/CondensedInfoContext': { useCondensedInfo: () => ({ currentReport: data.report, busy: false, failed: false, setFailed() {} }) },
    '@/Translation/TranslationContext': { useTranslation: () => ({ language: data.language, t: key => key, translateMessage }) },
    'react-native': { View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', Platform: { OS: 'web' } },
  }, { Blob, URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:test'; }, revokeObjectURL() {} }, document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } }, setTimeout() {} });
  function flatten(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(flatten); return [node, ...flatten(node.props?.children)]; }
  return { data, requests, blobs, render() { cursor = 0; const nodes = flatten(component.default()); while (effects.length) effects.shift()(); return nodes; } };
}
const settle = () => new Promise(setImmediate);
test('display follows preference, discards obsolete translations, and downloads English', async () => {
  const h = setup();
  h.render();
  assert.equal(h.requests[0].source, 'en');
  h.data.language = 'fr'; h.render();
  h.requests[1].resolve('Rapport français'); await settle();
  h.requests[0].resolve('Informe español'); await settle();
  let nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'Rapport français'));
  assert.ok(!nodes.some(n => n.props.children === 'Informe español'));
  const download = nodes.find(n => n.type === 'Pressable' && n.props.children.props?.children === 'downloadUserInfo');
  await download.props.onPress();
  assert.equal(await h.blobs[0].text(), h.data.report);
  h.data.report = 'Updated English report';
  nodes = h.render();
  assert.ok(!nodes.some(n => n.props.children === 'Rapport français'));
  h.requests[2].reject(Error('offline')); await settle();
  nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'condensedTranslationFailed'));
  assert.ok(nodes.some(n => n.props.children === 'Updated English report'));
  h.data.language = 'en';
  nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'Updated English report'));
  assert.equal(h.requests.length, 3);
});
