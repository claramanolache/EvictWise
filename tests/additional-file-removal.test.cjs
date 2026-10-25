const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => mocks[name] ?? require(name) });
  return exports;
}
function setup(fail = false) {
  const slice = load('slice.ts', { '@/constants/assistantAI/prompt': { initialMessage: {} } });
  let state = { ...slice.default(undefined, { type: 'init' }), additionalFiles: [{ name: 'same.pdf', originalFileId: 'first', markdown: '' }, { name: 'same.pdf', originalFileId: 'second', markdown: '' }] };
  const slots = [], removed = []; let cursor = 0;
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
  };
  const component = load('components/AdditionalInformation.tsx', {
    react: hooks, 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'react-redux': { useSelector: fn => fn({ app: state }), useDispatch: () => action => { state = slice.default(state, action); } },
    '../../server/file-validation.cjs': require('../server/file-validation.cjs'),
    '@/components/FileValidationProgress': 'FileValidationProgress',
    '@/slice': slice, '@/components/ThemedPressable': 'Button', 'expo-document-picker': {},
    '@/context/ThemeContext': { useAppColorScheme: () => 'dark' }, '@/constants/theme': { getTheme: () => ({}) },
    '@/Translation/TranslationContext': { useTranslation: () => ({ t: k => k }) },
    '@/utils/documentFiles': { removeOriginalFile: async id => { if (fail) throw Error('storage unavailable'); removed.push(id); } },
  }).default;
  function flatten(n) { return !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(flatten) : [n, ...flatten(n.props?.children)]; }
  return { removed, state: () => state, render(isEditing) { cursor = 0; return flatten(component({ isEditing, onView() {} })); } };
}
const buttons = nodes => nodes.filter(n => n.props.accessibilityLabel?.startsWith('removeAdditionalFile '));
test('remove is edit-only and deletes the selected original even with duplicate filenames', async () => {
  const h = setup();
  assert.equal(buttons(h.render(false)).length, 0);
  const remove = buttons(h.render(true))[1];
  remove.props.onPress(); remove.props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(h.removed, ['second']);
  assert.equal(h.state().additionalFiles.length, 1);
  assert.equal(h.state().additionalFiles[0].originalFileId, 'first');
});
test('failed storage deletion keeps the profile entry and reports the failure', async () => {
  const h = setup(true);
  buttons(h.render(true))[0].props.onPress();
  await new Promise(setImmediate);
  assert.equal(h.state().additionalFiles.length, 2);
  assert.ok(h.render(true).some(n => n.props.children === 'removeAdditionalFileFailed'));
});
