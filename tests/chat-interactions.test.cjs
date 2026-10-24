const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(messages = []) {
  const slots = [], requests = [], sent = [];
  let cursor = 0;
  const state = { messages };
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useMemo(fn) { const i = cursor++; return slots[i] ??= fn(); },
    useEffect() {}, useLayoutEffect() {},
  };
  const mocks = {
    react: hooks,
    'react-native': { Platform: { OS: 'web' }, Animated: { Value: class {} }, useWindowDimensions: () => ({ width: 1200 }), Text: 'Text', View: 'View', ScrollView: 'ScrollView', TextInput: 'TextInput', KeyboardAvoidingView: 'KeyboardAvoidingView' },
    'react-redux': { useSelector: fn => fn({ app: state }), useDispatch: () => message => { sent.push(message); state.messages = [...state.messages, message]; } },
    'expo-router': { useLocalSearchParams: () => ({}), useRouter: () => ({}) },
    '@/context/ThemeContext': { useAppColorScheme: () => 'dark' },
    '@/Translation/TranslationContext': { useTranslation: () => ({ t: key => key }) },
    '@/constants/theme': { getTheme: () => ({}), Fonts: { sans: 'sans' } },
    '@/components/Layout': 'Layout', '@/components/MessageRender': 'MessageRender', '@/components/ThemedPressable': 'Button',
    '@react-native-vector-icons/fontawesome-free-solid': { FontAwesomeFreeSolid: 'Icon' },
    '@/utils/chatProfileContext': { buildChatProfileContext: () => 'profile context' },
    '@/constants/assistantAI/prompt': { systemPrompt: 'original system prompt' },
    '@/types': { serializeMessages: messages => messages }, '@/slice': { addMessage: message => message },
    '@/auth/api': { chatRequest: request => new Promise((resolve, reject) => requests.push({ request, resolve, reject })) },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/app/chat.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), process: { env: {} } });
  function flatten(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(flatten); return [node, ...flatten(node.props?.children)]; }
  return { sent, requests, render() { cursor = 0; const nodes = flatten(exports.default()); return { get: type => nodes.find(node => node.type === type), nodes }; } };
}
function key(input, values) {
  let prevented = false;
  input.props.onKeyPress({ nativeEvent: { key: 'Enter', ...values }, preventDefault() { prevented = true; } });
  return prevented;
}

test('Enter submits once with original profile context; Shift+Enter and IME preserve input', async () => {
  const h = setup();
  h.render().get('TextInput').props.onChangeText('My follow-up');
  const input = h.render().get('TextInput');
  assert.equal(key(input, { shiftKey: true }), false);
  assert.equal(key(input, { isComposing: true }), false);
  assert.equal(key(input, { keyCode: 229 }), false);
  assert.equal(h.requests.length, 0);
  assert.equal(key(input, {}), true);
  key(input, {});
  assert.equal(h.requests.length, 1);
  assert.equal(h.sent[0].content, 'My follow-up');
  assert.equal(h.requests[0].request.profileContext, 'profile context');
  assert.equal(h.render().get('TextInput').props.editable, false);
  h.requests[0].resolve({ content: '**Unchanged response**', sources: [] });
  await new Promise(setImmediate);
  assert.equal(h.sent[1].content, '**Unchanged response**');
  assert.equal(h.render().get('TextInput').props.editable, true);
});

test('empty messages cannot submit and request errors preserve the existing error message path', async () => {
  const h = setup();
  key(h.render().get('TextInput'), {});
  assert.equal(h.requests.length, 0);
  h.render().get('TextInput').props.onChangeText('Question');
  key(h.render().get('TextInput'), {});
  h.requests[0].reject('offline');
  await new Promise(setImmediate);
  assert.equal(h.sent[1].type, 'error');
  assert.equal(h.render().get('TextInput').props.editable, true);
});

test('welcome suggestions only appear for an empty conversation and fill the composer', () => {
  const h = setup();
  const suggestion = h.render().nodes.find(node => node.type === 'Button' && node.props.variant === 'secondary');
  suggestion.props.onPress();
  assert.equal(h.render().get('TextInput').props.value, 'suggestNotice');
  const existing = setup([{ type: 'chat', id: '1', role: 'assistant', content: 'Existing conversation' }]).render();
  assert.equal(existing.nodes.filter(node => node.type === 'Button' && node.props.variant === 'secondary').length, 0);
  assert.equal(existing.get('MessageRender').props.msg.content, 'Existing conversation');
});

test('new content scrolls only when reader is near the bottom', () => {
  const h = setup();
  const scroll = h.render().get('ScrollView');
  let scrolls = 0;
  scroll.props.ref.current = { scrollToEnd() { scrolls++; } };
  scroll.props.onContentSizeChange();
  assert.equal(scrolls, 1);
  scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 100 }, contentSize: { height: 2000 }, layoutMeasurement: { height: 600 } } });
  scroll.props.onContentSizeChange();
  assert.equal(scrolls, 1);
  scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 1390 }, contentSize: { height: 2000 }, layoutMeasurement: { height: 600 } } });
  scroll.props.onContentSizeChange();
  assert.equal(scrolls, 2);
});
