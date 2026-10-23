const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup(saved, legacy) {
  const state = { preferredLanguage: saved }, slots = [], effects = [], storage = new Map();
  if (legacy) storage.set('preferred-language', legacy);
  let cursor = 0;
  const dispatch = action => { state.preferredLanguage = action.payload; };
  const hooks = {
    createContext: () => ({ Provider: 'provider' }),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) { slots[i]?.cleanup?.(); effects.push(() => { slots[i] = { deps, cleanup: fn() }; }); } },
  };
  const mocks = {
    react: hooks,
    'react-redux': { useDispatch: () => dispatch, useSelector: fn => fn({ app: state }) },
    '@/slice': { setPreferredLanguage: payload => ({ payload }) },
    './languages': { LANGUAGES: ['en', 'es', 'fr'].map(code => ({ code })) },
    './translate': { translateTexts: async ({ texts }) => texts.map(text => ({ translatedText: text })), translateText: async ({ text }) => text },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/Translation/TranslationContext.jsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } });
  return { state, render() { cursor = 0; const value = exports.TranslationProvider({ children: null }).props.value; while (effects.length) effects.shift()(); return value; } };
}

test('translation selection saves profile preference and survives reload', () => {
  const h = setup();
  assert.equal(h.render().conversationTranslation, null);
  h.render().translateConversation('es');
  assert.equal(h.state.preferredLanguage, 'es');
  assert.equal(h.render().language, 'es');
  const restored = setup(JSON.parse(JSON.stringify(h.state)).preferredLanguage).render();
  assert.equal(restored.language, 'es');
  assert.equal(restored.conversationTranslation.language, 'es');
});
test('migrates legacy language; profile value wins over stale browser value', () => {
  const h = setup(undefined, 'fr');
  assert.equal(h.render().language, 'fr');
  assert.equal(h.state.preferredLanguage, 'fr');
  assert.equal(setup('es', 'fr').render().language, 'es');
});
test('same-language selections retry translation and unsupported preferences are ignored', () => {
  const h = setup('es');
  const first = h.render();
  first.translateConversation('es');
  assert.notEqual(h.render().conversationTranslation, first.conversationTranslation);
  h.render().setLanguage('invalid');
  assert.equal(h.state.preferredLanguage, 'es');
  assert.equal(setup('invalid', 'invalid').render().language, 'en');
});
