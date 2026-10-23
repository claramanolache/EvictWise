const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const organizations = require('../src/data/lawyers.json');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name) });
  return exports;
}
function hooks() {
  const slots = [], effects = []; let cursor = 0;
  return {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) { slots[i]?.cleanup?.(); effects.push(() => { slots[i] = { deps, cleanup: fn() }; }); } },
    render(fn) { cursor = 0; const value = fn(); while (effects.length) effects.shift()(); return value; },
  };
}
const settle = () => new Promise(setImmediate);
test('details translate as a batch and obsolete language responses cannot replace the latest', async () => {
  const react = hooks(), requests = [];
  const { useLawyerTranslation } = load('hooks/useLawyerTranslation.ts', { react, '@/data/lawyers.json': organizations,
    '@/Translation/translate': { translateTexts: input => new Promise((resolve, reject) => requests.push({ input, resolve, reject })) } });
  const render = language => react.render(() => useLawyerTranslation(language));
  assert.equal(render('en').loading, false);
  assert.equal(requests.length, 0);
  assert.equal(render('es').loading, true);
  render('fr');
  assert.ok(!requests[0].input.texts.includes(organizations[0].name));
  requests[1].resolve(requests[1].input.texts.map(text => ({ translatedText: `fr:${text}` })));
  await settle();
  requests[0].resolve(requests[0].input.texts.map(text => ({ translatedText: `es:${text}` })));
  await settle();
  assert.equal(render('fr').translateDetail(organizations[0].description), `fr:${organizations[0].description}`);
  assert.equal(render('en').translateDetail(organizations[0].description), organizations[0].description);
});
test('incomplete translation falls back to English and can be retried', async () => {
  const react = hooks(), requests = [];
  const { useLawyerTranslation } = load('hooks/useLawyerTranslation.ts', { react, '@/data/lawyers.json': organizations,
    '@/Translation/translate': { translateTexts: input => new Promise(resolve => requests.push({ input, resolve })) } });
  const render = () => react.render(() => useLawyerTranslation('es'));
  render(); requests[0].resolve([]); await settle();
  assert.equal(render().failed, true);
  assert.equal(render().translateDetail('advice'), 'advice');
  render().retry(); assert.equal(render().loading, true);
  requests[1].resolve(requests[1].input.texts.map(text => ({ translatedText: `es:${text}` })));
  await settle(); assert.equal(render().failed, false);
});
test('section title expands and collapses the complete grid while contact URLs stay original', () => {
  const react = hooks(), opened = [];
  const { default: Page } = load('app/lawyer-connect.tsx', {
    react, '@/data/lawyers.json': organizations,
    '@react-native-vector-icons/fontawesome-free-solid': 'Icon',
    '@/hooks/useLawyerTranslation': { useLawyerTranslation: () => ({ translateDetail: text => `translated:${text}`, loading: false, failed: false }) },
    '@/components/ThemedPressable': 'Button', '@/components/Layout': 'Layout',
    '@/context/ThemeContext': { useAppColorScheme: () => 'dark' },
    '@/constants/theme': { getTheme: () => ({}) },
    '@/Translation/TranslationContext': { useTranslation: () => ({ language: 'es', t: key => key }) },
    'react-redux': { useSelector: fn => fn({ app: { location: null } }) },
    'expo-router': { useRouter: () => ({ push() {} }) },
    'react-native': { Text: 'Text', View: 'View', ScrollView: 'ScrollView', Pressable: 'Pressable', Linking: { openURL: async url => opened.push(url) } },
  });
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const render = () => flatten(react.render(Page));
  const header = nodes => nodes.find(node => node.props.accessibilityLabel === 'lawyerOrganizations');
  let nodes = render();
  assert.equal(header(nodes).props.accessibilityState.expanded, false);
  assert.ok(nodes.some(n => n.props.name === "chevron-down"));
  assert.ok(!nodes.some(n => n.props.children === organizations[0].name));
  assert.ok(!nodes.some(n => n.props.children === `translated:${organizations[0].description}`));
  header(nodes).props.onPress(); nodes = render();
  assert.equal(header(nodes).props.accessibilityState.expanded, true);
  for (const org of organizations) assert.ok(nodes.some(n => n.props.children === org.name));
  assert.ok(nodes.some(n => n.props.name === "chevron-up"));
  assert.ok(nodes.some(n => n.props.children === `translated:${organizations[0].description}`));
  nodes.find(n => n.props.accessibilityLabel === `lawyerWebsite: ${organizations[0].website}`).props.onPress();
  assert.equal(opened[0], organizations[0].website);
  header(nodes).props.onPress(); nodes = render();
  assert.equal(header(nodes).props.accessibilityState.expanded, false);
  assert.ok(nodes.some(n => n.props.name === "chevron-down"));
  assert.ok(!nodes.some(n => n.props.children === organizations[0].name));
});
