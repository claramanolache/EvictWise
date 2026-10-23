const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function setup({ firstTime = true, pathname = '/profile' } = {}) {
  const state = { firstTime }, slots = [], effects = [], timers = new Map();
  let cursor = 0, menuOpen = false, nextTimer = 0, finished = 0;
  const setMenuOpen = value => { menuOpen = value; };
  const hooks = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { value: fn, deps }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const mocks = {
    react: hooks, 'expo-router': { usePathname: () => pathname },
    'react-redux': { useSelector: fn => fn({ app: state }), useDispatch: () => () => { state.firstTime = false; finished++; } },
    '@/slice': { viewFirstTime: () => ({ type: 'done' }) },
    '@/context/MenuContext': { useMenu: () => ({ menuOpen, setMenuOpen }) },
    '@/context/ThemeContext': { useAppColorScheme: () => 'dark' }, '@/constants/theme': { getTheme: () => ({}) },
    '@/Translation/TranslationContext': { useTranslation: () => ({ t: key => key }) },
    'react-native': { View: 'View', Text: 'Text', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', useWindowDimensions: () => ({ width: 375, height: 740 }) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/context/GuidedTourContext.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => mocks[name] ?? require(name), setInterval: fn => { timers.set(++nextTimer, fn); return nextTimer; }, clearInterval: id => timers.delete(id) });
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  return { state, timers, menu: () => menuOpen, finished: () => finished,
    render() { cursor = 0; const nodes = flatten(exports.GuidedTourProvider({ children: null })); while (effects.length) effects.shift()(); return nodes; } };
}
const button = (nodes, label) => nodes.find(n => n.type === 'Pressable' && n.props.children?.props?.children === label);
test('tour progresses through all features, opens menu, restores it and persists completion', () => {
  const h = setup(); let nodes = h.render();
  assert.equal(nodes.find(n => n.type === 'Modal').props.visible, true);
  for (const title of ['tourUploadTitle', 'tourMenuTitle', 'menuProfile', 'menuChat', 'menuCalendar', 'menuLawyerConnect', 'tourReadyTitle']) {
    nodes = h.render(); assert.ok(nodes.some(n => n.props.children === title));
    assert.equal(h.menu(), ['menuProfile', 'menuChat', 'menuCalendar', 'menuLawyerConnect'].includes(title));
    button(nodes, title === 'tourReadyTitle' ? 'tourStart' : 'tourNext').props.onPress();
  }
  nodes = h.render(); assert.equal(h.finished(), 1); assert.equal(h.menu(), false);
  assert.equal(nodes.find(n => n.type === 'Modal').props.visible, false);
  assert.equal(h.timers.size, 0);
});
test('skip and platform dismiss finish the tour; returning users and other pages do not show it', () => {
  const h = setup(); button(h.render(), 'tourSkip').props.onPress(); h.render(); assert.equal(h.state.firstTime, false);
  const dismissed = setup(); dismissed.render().find(n => n.type === 'Modal').props.onRequestClose(); dismissed.render(); assert.equal(dismissed.state.firstTime, false);
  for (const options of [{ firstTime: false }, { pathname: '/chat' }]) {
    const hidden = setup(options); assert.equal(hidden.render().find(n => n.type === 'Modal').props.visible, false); assert.equal(hidden.timers.size, 0);
  }
});
test('upload target is revealed and pointer bubble stays within a narrow viewport', () => {
  const h = setup(); let nodes = h.render(); let revealed = 0;
  const unregister = nodes.find(n => n.type === 'Provider').props.value.register('upload', {
    reveal: () => revealed++, node: { measureInWindow: callback => callback(20, 180, 335, 44) },
  });
  for (const fn of h.timers.values()) fn();
  nodes = h.render();
  assert.equal(revealed, 1);
  const bubble = nodes.find(n => n.props.accessibilityViewIsModal);
  assert.ok(bubble.props.style.left >= 0);
  assert.ok(bubble.props.style.left + bubble.props.style.width <= 375);
  assert.ok(bubble.props.style.top >= 0);
  unregister(); button(nodes, 'tourSkip').props.onPress(); h.render();
});
