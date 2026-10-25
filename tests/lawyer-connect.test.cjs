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
  const app = { location: null };
  const { default: Page } = load('app/lawyer-connect.tsx', {
    '@/hooks/useProfileCoordinates': { useProfileCoordinates: () => ({ loading: false, failed: false }) },
    react, '@/data/lawyers.json': organizations,
    '@/utils/lawyerRecommendations': load('utils/lawyerRecommendations.ts', {}),
    '@/slice': { setLawyerPreferences: value => ({ type: 'preferences', payload: value }) },
    '@/components/LawyerPreferences': 'LawyerPreferences',
    '@react-native-vector-icons/fontawesome-free-solid': 'Icon',
    '@/hooks/useLawyerTranslation': { useLawyerTranslation: () => ({ translateDetail: text => `translated:${text}`, loading: false, failed: false }) },
    '@/components/ThemedPressable': 'Button', '@/components/Layout': 'Layout',
    '@/context/ThemeContext': { useAppColorScheme: () => 'dark' },
    '@/constants/theme': { getTheme: () => ({}) },
    '@/Translation/TranslationContext': { useTranslation: () => ({ language: 'es', t: key => key }) },
    'react-redux': { useDispatch: () => action => { app.lawyerPreferences = action.payload; }, useSelector: fn => fn({ app }) },
    'expo-router': { useRouter: () => ({ push() {} }) },
    'react-native': { Modal: 'Modal', Text: 'Text', View: 'View', ScrollView: 'ScrollView', Pressable: 'Pressable', Linking: { openURL: async url => opened.push(url) } },
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
  assert.equal(nodes.filter(n => n.props.children === 'lawyerTestPriceDisclosure').length, 7);
  assert.ok(nodes.some(n => n.props.name === "chevron-up"));
  assert.ok(nodes.some(n => n.props.children === `translated:${organizations[0].description}`));
  nodes.find(n => n.props.accessibilityLabel === `lawyerWebsite: ${organizations[0].website}`).props.onPress();
  assert.equal(opened[0], organizations[0].website);
  header(nodes).props.onPress(); nodes = render();
  assert.equal(header(nodes).props.accessibilityState.expanded, false);
  assert.ok(nodes.some(n => n.props.name === "chevron-down"));
  assert.ok(!nodes.some(n => n.props.children === organizations[0].name));
  assert.ok(!nodes.some(n => n.type === 'Modal'));
  nodes.find(n => n.props.accessibilityLabel === 'doneEditing').props.onPress();
  nodes = render();
  assert.ok(nodes.some(n => n.type === 'Modal'));
  assert.ok(nodes.some(n => n.props.children === 'lawyerDistanceUnknown'));
  assert.ok(nodes.some(n => n.props.children === 'Law Foundation of Silicon Valley'));
  assert.equal(nodes.filter(n => n.props.children === 'lawyerTestPriceDisclosure').length, 2);
  nodes.find(n => n.props.accessibilityLabel === 'closeDocument').props.onPress();
  nodes = render();
  assert.ok(!nodes.some(n => n.type === 'Modal'));
  app.location = { country: 'USA', state: 'CA', city: 'Palo Alto', latitude: 37.45, longitude: -122.15 };
  nodes = render();
  nodes.find(n => n.props.accessibilityLabel === 'doneEditing').props.onPress();
  nodes = render();
  assert.ok(nodes.some(n => n.props.children === 'Law Foundation of Silicon Valley'));
  assert.equal(nodes.filter(n => n.props.children === 'lawyerTestPriceDisclosure').length, 2);
  assert.ok(!nodes.some(n => typeof n.props.children === 'string' && n.props.children.startsWith('lawyerCoverage')));
  assert.ok(nodes.some(n => typeof n.props.children === 'string' && n.props.children.startsWith('lawyerDistance: ') && n.props.children.endsWith('lawyerMiles')));
  nodes.find(n => n.props.accessibilityLabel === 'lawyerWebsite: https://www.lawfoundation.org/').props.onPress();
  assert.equal(opened.at(-1), 'https://www.lawfoundation.org/');
  nodes.find(n => n.type === 'Modal').props.onRequestClose();
  assert.ok(!render().some(n => n.type === 'Modal'));
  const option = (nodes, label) => nodes.find(n => n.props.accessibilityRole === 'checkbox' && n.props.accessibilityLabel === `translated:${label}`);
  nodes = render();
  assert.equal(option(nodes, 'eviction defense').props.accessibilityState.checked, true);
  option(nodes, 'mediation').props.onPress();
  nodes = render();
  assert.equal(option(nodes, 'mediation').props.accessibilityState.checked, true);
  assert.equal(option(nodes, 'eviction defense').props.accessibilityState.checked, true);
  option(nodes, 'eviction defense').props.onPress();
  nodes = render();
  assert.equal(option(nodes, 'mediation').props.accessibilityState.checked, true);
  option(nodes, 'mediation').props.onPress();
  nodes = render();
  const done = nodes.find(n => n.props.accessibilityLabel === 'doneEditing');
  assert.equal(done.props.disabled, true);
  done.props.onPress();
  assert.ok(!render().some(n => n.type === 'Modal'));
  nodes = render();
  header(nodes).props.onPress();
  nodes = render();
  const badges = nodes => nodes.filter(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.endsWith('% lawyerMatchScore'));
  const previousScores = badges(nodes).map(n => n.props.accessibilityLabel);
  assert.equal(previousScores.length, organizations.length);
  option(nodes, 'mediation').props.onPress();
  nodes = render();
  assert.deepEqual(badges(nodes).map(n => n.props.accessibilityLabel), previousScores);
  nodes.find(n => n.props.accessibilityLabel === 'doneEditing').props.onPress();
  nodes = render();
  const nextScores = badges(nodes).map(n => n.props.accessibilityLabel);
  assert.equal(nextScores.length, organizations.length);
  assert.notDeepEqual(nextScores, previousScores);
  const { rankLawyers } = load('utils/lawyerRecommendations.ts', {});
  const expected = rankLawyers(organizations, app.lawyerPreferences, app.location, 'es');
  assert.deepEqual(nextScores, Array.from(expected, item => `${item.organization.name}: ${item.score}% lawyerMatchScore`));
  nodes.find(n => n.props.accessibilityLabel === 'closeDocument').props.onPress();
  assert.deepEqual(badges(render()).map(n => n.props.accessibilityLabel), nextScores);

});
