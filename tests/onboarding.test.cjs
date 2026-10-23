const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => mocks[name] ?? require(name), ...extra });
  return exports;
}
function welcome() {
  const slots = [], requests = []; let cursor = 0, language = 'en';
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
  };
  const Page = load('app/welcome.tsx', {
    react: hooks, '@/components/ThemedPressable': 'Button',
    '@/context/AuthContext': { useAuth: () => ({ authenticate: async (...args) => { requests.push(args); } }) },
    '@/context/ThemeContext': { useAppColorScheme: () => 'dark' },
    '@/constants/theme': { getTheme: () => ({}) },
    '@/Translation/languages': { LANGUAGES: [{ code: 'en', name: 'English' }, { code: 'es', name: 'Español' }] },
    '@/Translation/TranslationContext': { useTranslation: () => ({ language, t: key => key, setLanguage: value => { language = value; } }) },
    '@react-native-vector-icons/fontawesome-free-solid': 'Icon',
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native': { Platform: { OS: 'web' }, View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput', KeyboardAvoidingView: 'KeyboardAvoidingView', ActivityIndicator: 'ActivityIndicator' },
  }).default;
  const flatten = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(flatten) : [n, ...flatten(n.props?.children)];
  return { requests, render() { cursor = 0; return flatten(Page()); } };
}
test('language comes first, introduction follows, and matching passwords submit chosen language', async () => {
  const h = welcome(); let nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'welcomeChooseLanguage'));
  assert.ok(!nodes.some(n => n.type === 'TextInput'));
  nodes.filter(n => n.props.accessibilityRole === 'radio')[1].props.onPress();
  nodes.find(n => n.type === 'Button').props.onPress(); nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'welcomeTitle'));
  nodes.find(n => n.type === 'Button').props.onPress(); nodes = h.render();
  const field = label => nodes.find(n => n.type === 'TextInput' && n.props.accessibilityLabel === label);
  field('authUsername').props.onChangeText('tenant');
  field('authPassword').props.onChangeText('A long unique passphrase');
  field('authConfirmPassword').props.onChangeText('Different passphrase');
  assert.equal(field('authPassword').props.secureTextEntry, true);
  nodes = h.render(); await nodes.find(n => n.type === 'Button').props.onPress();
  assert.equal(h.requests.length, 0);
  nodes = h.render(); assert.ok(nodes.some(n => n.props.children === 'authPasswordMismatch'));
  field('authConfirmPassword').props.onChangeText('A long unique passphrase');
  nodes = h.render(); nodes.find(n => n.type === 'Button').props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(h.requests[0], ['register', 'tenant', 'A long unique passphrase', 'es']);
  nodes = h.render(); assert.equal(field('authPassword').props.value, '');
});

test('persisted profiles are separated by account and never read the legacy unowned profile', async () => {
  const memory = new Map([['persist:app', 'legacy private profile']]);
  const storage = { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => { memory.set(key, value); }, removeItem: async key => { memory.delete(key); } };
  const reducerModule = load('slice.ts', { '@/constants/assistantAI/prompt': { initialMessage: { id: 'initial', type: 'chat', role: 'assistant', content: 'Welcome' } } });
  const { createAppStore } = load('store.ts', { './slice': reducerModule, 'redux-persist/lib/storage': storage }, { setTimeout, clearTimeout, setInterval, clearInterval, console });
  const ready = instance => new Promise(resolve => { if (instance.persistor.getState().bootstrapped) return resolve(); const unsubscribe = instance.persistor.subscribe(() => { if (instance.persistor.getState().bootstrapped) { unsubscribe(); resolve(); } }); });
  const a = createAppStore('account-a'); await ready(a);
  a.store.dispatch(reducerModule.addMessage({ id: 'secret-a', type: 'chat', role: 'user', content: 'Private case details' }));
  await a.persistor.flush(); a.persistor.pause();
  const b = createAppStore('account-b'); await ready(b);
  assert.equal(b.store.getState().app.messages.length, 1); b.persistor.pause(); await b.persistor.flush();
  const restored = createAppStore('account-a'); await ready(restored);
  assert.equal(restored.store.getState().app.messages[1].id, 'secret-a'); restored.persistor.pause(); await restored.persistor.flush();
  assert.equal(memory.get('persist:app'), 'legacy private profile');
});

test('route guards expose welcome to guests and Profile as the authenticated landing screen', () => {
  let user = null;
  const Stack = Object.assign(props => ({ type: 'Stack', props }), { Screen: 'Screen', Protected: 'Protected' });
  const Root = load('app/_layout.tsx', {
    react: { useMemo: fn => fn(), useEffect() {} },
    '@/context/ThemeContext': { ThemeProvider: 'ThemeProvider', useAppColorScheme: () => 'dark' },
    '@/context/AuthContext': { AuthProvider: 'AuthProvider', useAuth: () => ({ user, status: 'ready' }) },
    '@/context/CondensedInfoContext': { CondensedInfoProvider: 'CondensedInfoProvider' },
    '@/context/MenuContext': { MenuProvider: 'MenuProvider' },
    '@/context/GuidedTourContext': { GuidedTourProvider: 'GuidedTourProvider' },
    '@/Translation/TranslationContext': { TranslationProvider: 'TranslationProvider' },
    '@/constants/theme': { getTheme: () => ({}) }, '@/slice': {},
    '@/store': { createAppStore: () => ({ store: {}, persistor: {} }) },
    'react-redux': { Provider: 'Provider', useDispatch: () => () => {}, useSelector: fn => fn({ app: {} }) },
    'redux-persist/integration/react': { PersistGate: 'PersistGate' },
    'expo-router': { Stack }, 'react-native': {}, '@thednp/dommatrix': class {},
  }, { global: {} }).default;
  function walk(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(walk);
    if (typeof node.type === 'function') return walk(node.type(node.props));
    return [node, ...walk(node.props?.children)];
  }
  let nodes = walk(Root());
  assert.equal(nodes.find(n => n.type === 'Stack').props.initialRouteName, 'welcome');
  assert.equal(nodes.filter(n => n.type === 'Protected')[0].props.guard, true);
  assert.equal(nodes.filter(n => n.type === 'Protected')[1].props.guard, false);
  assert.ok(!nodes.some(n => n.type === 'CondensedInfoProvider'));
  user = { id: 'account-a', username: 'tenant', preferredLanguage: 'es' };
  nodes = walk(Root());
  assert.equal(nodes.find(n => n.type === 'Stack').props.initialRouteName, 'profile');
  assert.equal(nodes.filter(n => n.type === 'Protected')[0].props.guard, false);
  assert.equal(nodes.filter(n => n.type === 'Protected')[1].props.guard, true);
  assert.ok(nodes.some(n => n.type === 'CondensedInfoProvider'));
});


test('welcome containers never receive bare strings, including an empty account error', () => {
  const h = welcome();
  function verify(nodes) {
    function check(children) {
      if (Array.isArray(children)) return children.forEach(check);
      assert.notEqual(typeof children, 'string', 'Text must be wrapped in Text, even when empty');
      assert.notEqual(typeof children, 'number', 'Numbers must be wrapped in Text');
      if (children?.type === Symbol.for('react.fragment')) check(children.props.children);
    }
    for (const node of nodes) {
      if (['View', 'Pressable', 'Button', 'ScrollView', 'SafeAreaView', 'KeyboardAvoidingView'].includes(node.type)) check(node.props.children);
    }
  }
  let nodes = h.render(); verify(nodes);
  nodes.find(n => n.type === 'Button').props.onPress();
  nodes = h.render(); verify(nodes);
  nodes.find(n => n.type === 'Button').props.onPress();
  nodes = h.render(); verify(nodes);
  nodes.find(n => n.type === 'Pressable' && n.props.children?.props?.children === 'authAlreadyAccount').props.onPress();
  verify(h.render());
});
