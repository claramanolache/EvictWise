const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup() {
  const state = { location: null, events: [], messages: [], evictionNotice: null, leaseAgreement: null };
  const slots = [], effects = [], timers = new Map(), requests = [];
  let cursor = 0, nextTimer = 0;
  const dispatch = report => { state.userInfoReport = report; };
  function memo(fn, deps) {
    const i = cursor++, old = slots[i];
    if (!old || deps.some((v, j) => v !== old.deps[j])) slots[i] = { value: fn, deps };
    return slots[i].value;
  }
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], v => { slots[i] = v; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useCallback: memo,
    useEffect(fn, deps) {
      const i = cursor++, old = slots[i];
      if (!old || deps.some((v, j) => v !== old.deps[j])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    },
  };
  const mocks = {
    react: hooks,
    'react-native': { Platform: { OS: 'web' }, useColorScheme: () => 'light' },
    'react-redux': { useDispatch: () => dispatch, useSelector: fn => fn({ app: state }) },
    '@/slice': { setUserInfoReport: value => value },
    '@/constants/theme': { getTheme: () => ({}) },
    '@/Translation/TranslationContext': { useTranslation: () => ({ t: k => k }) },
    '@/utils/condensedUserInfo': {
      parseUserInfoDetails: JSON.parse,
      formatUserInfo: (details, location) => JSON.stringify({ details, location }),
    },
    openai: class { chat = { completions: { create: (request, options) => new Promise(resolve => requests.push({ request, signal: options.signal, resolve })) } }; },
  };
  const output = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/CondensedUserInfo.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports: output, require: n => mocks[n] ?? require(n), AbortController, process: { env: {} },
    setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout: id => timers.delete(id),
  });
  return {
    state, requests, timers,
    render() { cursor = 0; output.default(); while (effects.length) effects.shift()(); },
    flushTimers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
const settle = () => new Promise(setImmediate);
const result = name => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ userName: name }) } }] });

test('initial report and location edits regenerate automatically; cached report does not loop', async () => {
  const h = setup(); h.render(); h.flushTimers(); await settle();
  assert.ok(h.state.userInfoReport);
  h.render(); assert.equal(h.timers.size, 0);
  h.state.location = { city: 'Oakland' }; h.render(); h.flushTimers(); await settle();
  assert.match(h.state.userInfoReport.text, /Oakland/);
  assert.equal(h.requests.length, 0);
});

test('rapid edits are debounced and obsolete requests cannot overwrite newer profile data', async () => {
  const h = setup();
  h.state.evictionNotice = { markdown: 'First' }; h.render();
  h.state.evictionNotice = { markdown: 'Second' }; h.render();
  assert.equal(h.timers.size, 1);
  h.flushTimers(); assert.equal(h.requests.length, 1);
  h.state.evictionNotice = { markdown: 'Latest' }; h.render();
  assert.equal(h.requests[0].signal.aborted, true);
  h.flushTimers();
  h.requests[1].resolve(result('Latest')); await settle();
  h.requests[0].resolve(result('Obsolete')); await settle();
  assert.match(h.state.userInfoReport.text, /Latest/);
  assert.doesNotMatch(h.state.userInfoReport.text, /Obsolete/);
});

test('additional uploads trigger refresh; unmount cancels pending generation', () => {
  const h = setup(); h.render(); h.flushTimers();
  h.state.additionalFiles = [{ name: 'extra.pdf', originalFileId: '1', markdown: '' }];
  h.render(); assert.equal(h.timers.size, 1);
  h.unmount(); assert.equal(h.timers.size, 0);
});
