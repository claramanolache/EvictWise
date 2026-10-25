const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${file}`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => mocks[name] ?? require(name), ...globals });
  return exports;
}
const types = load('case/types.ts');
const model = load('case/model.ts', { './types': types });
const config = load('case/config.ts');
const slice = load('slice.ts', { '@/constants/assistantAI/prompt': { initialMessage: {} } });
const json = value => JSON.parse(JSON.stringify(value));
function hooks() {
  const slots = []; let cursor = 0;
  return {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    render(fn) { cursor = 0; return fn(); },
  };
}
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
const reactNative = { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput', Linking: { openURL: async () => {} } };
const common = { '@/context/ThemeContext': { useAppColorScheme: () => 'dark' }, '@/constants/theme': { getTheme: () => ({ text: 'white', backgroundAccent: 'green', border: 'gray' }) }, '@/Translation/TranslationContext': { useTranslation: () => ({ t: key => key, language: 'en' }) }, 'react-native': reactNative, '@/components/ThemedPressable': 'ThemedButton' };
function page(initial) {
  const react = hooks(), actions = [], routes = [];
  let app = initial || slice.default(undefined, {});
  let failSave = false;
  const { default: Page } = load('app/case-status.tsx', { ...common, react,
    '@/components/Layout': 'Layout', '@/case/CaseUI': { CaseCard: 'Card', CaseButton: 'Button' },
    '@/case/CaseDetailsForm': 'Form', '@/case/CaseIntake': 'Intake', '@/case/config': config, '@/case/model': model, '@/slice': slice,
    '@/store': { flushAppStorage: async () => { if (failSave) throw Error('quota'); } },
    'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) },
    'react-redux': { useSelector: fn => fn({ app }), useStore: () => ({}), useDispatch: () => action => { actions.push(action); app = slice.default(app, action); } },
  });
  return { actions, routes, app: () => app, fail: () => { failSave = true; }, render: () => flatten(react.render(Page)) };
}
const button = (nodes, label) => nodes.find(node => node.type === 'Button' && node.props.label === label);
const tab = (nodes, label) => nodes.find(node => node.props.accessibilityRole === 'tab' && node.props.children.props.children === label);
test('intake preserves uncertainty and only uses explicit reports', () => {
  assert.equal(model.likelyStage(model.blankIntake), 'unknown');
  for (const [key, stage] of [['notice', 'notice'], ['courtPapers', 'court_started'], ['response', 'response'], ['hearing', 'hearing'], ['decision', 'after_decision']]) {
    assert.equal(model.likelyStage({ ...model.blankIntake, [key]: 'yes' }), stage);
  }
  const { nextIntakeQuestion } = load('case/CaseIntake.tsx', { ...common, react: hooks(), './model': model, './config': config });
  assert.equal(nextIntakeQuestion({}), 'decision');
  assert.equal(nextIntakeQuestion({ decision: 'yes' }), null);
  assert.equal(nextIntakeQuestion({ decision: 'no', hearing: 'no', courtPapers: 'yes' }), 'response');
  assert.equal(nextIntakeQuestion({ decision: 'unknown', hearing: 'unknown', courtPapers: 'no' }), 'notice');
});
test('verification requires provenance and a still-present supporting document', () => {
  assert.equal(model.evidenceLevel({ kind: 'user_reported' }, [{ originalFileId: 'a' }]), 'user_reported');
  const evidence = { kind: 'document_supported', documentId: 'a', source: 'Reviewed summons', reviewedAt: '2026-10-24T12:00:00Z' };
  assert.equal(model.evidenceLevel(evidence, [{ originalFileId: 'a' }]), 'document_supported');
  assert.equal(model.evidenceLevel(evidence, []), 'unknown');
  assert.equal(model.evidenceLevel({ kind: 'verified' }, []), 'unknown');
  assert.equal(model.evidenceLevel({ kind: 'verified', source: 'Court record', reviewedBy: 'Reviewer', reviewedAt: evidence.reviewedAt }, []), 'verified');
  const event = { date: [2026, 10, 2] };
  assert.equal(model.isVerifiedDeadline(event), false);
  assert.equal(model.isVerifiedDeadline({ ...event, verification: { status: 'verified' } }), false);
  const verified = { status: 'verified', source: 'Court notice', reviewedBy: 'Reviewer', reviewedAt: evidence.reviewedAt };
  assert.equal(model.isVerifiedDeadline({ ...event, verification: verified }), true);
  assert.equal(model.isVerifiedDeadline({ date: [2026, 1, 31], verification: verified }), false);
});
test('edit validation rejects impossible dates, future dates and contradictory filed responses', () => {
  const base = model.emptyCaseDetails();
  assert.equal(model.validateCaseDetails(base), null);
  assert.equal(model.validateCaseDetails({ ...base, serviceDate: '2026-02-30' }), 'caseDateInvalid');
  assert.equal(model.validateCaseDetails({ ...base, serviceDate: '2099-01-01' }), 'caseDateFuture');
  assert.equal(model.validateCaseDetails({ ...base, stage: 'notice', responseFiled: 'yes' }), 'caseConflictResponse');
  assert.equal(model.validateCaseDetails({ ...base, stage: 'response', responseFiled: 'no' }), 'caseConflictStageResponse');
  assert.equal(model.isCalifornia({ ...base, jurisdiction: { state: ' CA ' } }), true);
  assert.equal(model.isCalifornia({ ...base, jurisdiction: { state: 'New York' } }), false);
});
test('hypothetical case never populates or changes the real account and tracker exploration does not change status', () => {
  const h = page(); let nodes = h.render();
  assert.ok(button(nodes, 'caseSetup'));
  button(nodes, 'caseDemoOpen').props.onPress(); nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'caseCourtPapersReceived'));
  assert.ok(nodes.some(n => n.props.children === 'caseDemo'));
  nodes.find(n => n.props.accessibilityLabel?.startsWith('caseStageAfter:')).props.onPress(); nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'caseCourtPapersReceived'));
  assert.equal(h.actions.length, 0);
  tab(nodes, 'caseNextSteps').props.onPress(); nodes = h.render();
  nodes.find(n => n.props.accessibilityRole === 'checkbox').props.onPress();
  assert.equal(h.actions.length, 0);
  button(h.render(), 'caseDemoClose').props.onPress();
  assert.equal(h.app().caseStatus, undefined);
  assert.ok(button(h.render(), 'caseSetup'));
});
test('intake creates editable user-reported details, saves tasks, and links existing features', async () => {
  const h = page(); let nodes = h.render();
  button(nodes, 'caseSetup').props.onPress(); nodes = h.render();
  nodes.find(n => n.type === 'Intake').props.onApply({ ...model.blankIntake, courtPapers: 'yes', response: 'no' }); nodes = h.render();
  const form = nodes.find(n => n.type === 'Form');
  assert.equal(form.props.initial.stage, 'court_started');
  await form.props.onSave({ ...form.props.initial, jurisdiction: { state: 'CA', county: 'Santa Clara', city: 'Palo Alto' } });
  assert.equal(h.app().caseStatus.statusEvidence.kind, 'user_reported');
  nodes = h.render(); tab(nodes, 'caseNextSteps').props.onPress(); nodes = h.render();
  nodes.find(n => n.props.accessibilityRole === 'checkbox').props.onPress(); nodes = h.render();
  assert.equal(nodes.find(n => n.props.accessibilityRole === 'checkbox').props.accessibilityState.checked, true);
  assert.equal(h.app().caseStatus.completedTasks.length, 1);
  // Links is a stateless local component; render it to inspect its navigation buttons.
  const links = nodes.find(n => typeof n.type === 'function' && n.type.name === 'Links');
  const linkNodes = flatten(links.type(links.props));
  for (const label of ['caseChat', 'caseUpload', 'caseCalendar', 'caseLawyer']) button(linkNodes, label).props.onPress();
  assert.deepEqual(h.routes, ['/chat', '/profile', '/calendar', '/lawyer-connect']);
});
test('case updates reset verification and preserve task progress; failed storage does not claim saved', async () => {
  const base = { ...slice.default(undefined, {}), caseStatus: { ...json(model.hypotheticalCase), statusEvidence: { kind: 'verified', source: 'record', reviewedBy: 'reviewer', reviewedAt: '2026-10-24' }, completedTasks: ['court_started:organize-documents'] } };
  const h = page(base); let nodes = h.render();
  button(nodes, 'caseEdit').props.onPress(); nodes = h.render(); h.fail();
  assert.equal(await nodes.find(n => n.type === 'Form').props.onSave(model.hypotheticalCase.details), false);
  assert.equal(h.app().caseStatus.statusEvidence.kind, 'user_reported');
  assert.equal(h.app().caseStatus.completedTasks.length, 1);
  nodes = h.render();
  assert.ok(nodes.some(n => n.props.children === 'caseSaveFailed'));
  assert.ok(!nodes.some(n => n.props.children === 'caseSaved'));
  assert.ok(nodes.some(n => n.type === 'Form'));
});
test('no dates invented; existing extracted dates stay unverified and non-California guidance is withheld', () => {
  const base = { ...slice.default(undefined, {}), caseStatus: json(model.hypotheticalCase), events: [{ id: 'a', date: [2026, 10, 2], name: 'Extracted deadline', document: 'eviction', type: 'court' }] };
  let nodes = page(base).render();
  assert.ok(nodes.some(n => n.props.children === 'Extracted deadline'));
  assert.ok(nodes.some(n => n.props.children === 'caseDeadlineUnverified'));
  assert.ok(!nodes.some(n => n.props.children === 'caseVerified'));
  base.caseStatus.details.jurisdiction.state = 'NY';
  nodes = page(base).render();
  assert.ok(nodes.some(n => n.props.children === 'caseUnsupported'));
  assert.ok(!nodes.some(n => n.props.children === 'caseCourtMeaning'));
});
test('native persistence uses isolated account files and round-trips case data', async () => {
  const files = new Map();
  class Directory { constructor(...parts) { this.uri = parts.join('/'); } create() {} }
  class File {
    constructor(directory, name) { this.uri = directory.uri + '/' + name; }
    get exists() { return files.has(this.uri); }
    create() { files.set(this.uri, ''); }
    write(value) { files.set(this.uri, value); }
    async text() { return files.get(this.uri); }
    delete() { files.delete(this.uri); }
  }
  const storage = load('storage.native.ts', { 'expo-file-system': { File, Directory, Paths: { document: 'private' } } }).default;
  await storage.setItem('persist:app:user:alice', JSON.stringify(model.hypotheticalCase));
  assert.equal(await storage.getItem('persist:app:user:bob'), null);
  assert.equal(JSON.parse(await storage.getItem('persist:app:user:alice')).details.stage, 'court_started');
  await storage.removeItem('persist:app:user:alice');
  assert.equal(await storage.getItem('persist:app:user:alice'), null);
});
test('details form blocks invalid dates, then saves corrected fields without verification controls', async () => {
  const react = hooks(), saves = [];
  const Form = load('case/CaseDetailsForm.tsx', { ...common, react, './config': config, './model': model }).default;
  const initial = { ...model.emptyCaseDetails(), jurisdiction: { state: 'CA', county: '', city: '' } };
  const render = () => flatten(react.render(() => Form({ initial, onSave: async details => { saves.push(details); return true; }, onCancel() {} })));
  let nodes = render();
  const field = (nodes, label) => nodes.find(n => n.type === 'TextInput' && n.props.accessibilityLabel === label);
  field(nodes, 'caseServiceDate').props.onChangeText('2026-02-30');
  nodes = render(); await nodes.find(n => n.type === 'ThemedButton').props.onPress();
  await new Promise(setImmediate);
  assert.equal(saves.length, 0);
  assert.ok(render().some(n => n.props.children === 'caseDateInvalid'));
  field(render(), 'caseServiceDate').props.onChangeText('2020-01-01');
  field(render(), 'caseCity').props.onChangeText(' Palo Alto ');
  nodes = render(); await nodes.find(n => n.type === 'ThemedButton').props.onPress();
  await new Promise(setImmediate);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].jurisdiction.city, 'Palo Alto');
  assert.equal(saves[0].serviceDate, '2020-01-01');
  assert.equal(saves[0].statusEvidence, undefined);
});
test('case integration adapter preserves unknown and unverified data for future RAG', () => {
  const { caseIntegrationContext } = load('case/integrations.ts', { './model': model });
  const context = caseIntegrationContext(model.hypotheticalCase, [], [{ id: 'date', date: [2026, 10, 1], name: 'Extracted' }]);
  assert.equal(context.evidenceLevel, 'user_reported');
  assert.equal(context.deadlines[0].verified, false);
  assert.equal(context.reportedStage, 'court_started');
  assert.equal(context.jurisdiction.state, 'California');
});
test('web persistence rejects unavailable or full storage rather than silently succeeding', async () => {
  const unavailable = load('storage.ts').default;
  assert.equal(await unavailable.getItem('account'), null);
  await assert.rejects(unavailable.setItem('account', '{}'), /unavailable/);
  const full = load('storage.ts', {}, { localStorage: { getItem: () => null, setItem: () => { throw Error('quota'); } } }).default;
  await assert.rejects(full.setItem('account', '{}'), /quota/);
});
