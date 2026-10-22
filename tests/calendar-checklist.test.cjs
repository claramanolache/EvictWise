const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name === '@/constants/assistantAI/prompt' ? { initialMessage: { id: 'initial', type: 'chat', role: 'assistant', content: 'Hello' } } : require(name) });
  return exports;
}
const { sortChecklistEvents } = load('utils/calendarChecklist.ts');
const { default: reducer, toggleCalendarTask, clearEventsByDocument, clearEvents } = load('slice.ts');
const event = (id, date, document = 'eviction') => ({ id, date, document, name: `Task ${id}`, type: 'court' });
const normalize = value => JSON.parse(JSON.stringify(value));

test('unfinished tasks sort by deadline across months and years, completed last, without mutating events', () => {
  const events = [event('future', [2027, 0, 1]), event('complete', [2025, 0, 1]), event('soon', [2026, 10, 2]), event('overdue', [2026, 0, 1])];
  const sorted = sortChecklistEvents(events, new Set(['complete']));
  assert.deepEqual(normalize(sorted.map(e => e.id)), ['overdue', 'soon', 'future', 'complete']);
  assert.equal(events[0].id, 'future');
});

test('legacy persisted data supports completing, reloading and undoing without changing deadlines', () => {
  const state = { ...reducer(undefined, { type: 'init' }), events: [event('task', [2026, 10, 2])] };
  delete state.completedCalendarTasks;
  const complete = reducer(state, toggleCalendarTask('task'));
  assert.deepEqual(normalize(complete.completedCalendarTasks), ['task']);
  assert.deepEqual(normalize(complete.events), normalize(state.events));
  const restored = normalize(complete);
  assert.deepEqual(normalize(reducer(restored, toggleCalendarTask('task')).completedCalendarTasks), []);
  assert.equal(reducer(complete, toggleCalendarTask('missing')), complete);
});

test('replacing a document removes stale task completions but keeps other documents', () => {
  let state = { ...reducer(undefined, { type: 'init' }), events: [event('notice', [2026, 10, 2]), event('lease', [2026, 11, 2], 'lease')] };
  state = reducer(reducer(state, toggleCalendarTask('notice')), toggleCalendarTask('lease'));
  state = reducer(state, clearEventsByDocument('eviction'));
  assert.deepEqual(normalize(state.completedCalendarTasks), ['lease']);
  assert.deepEqual(normalize(reducer(state, clearEvents()).completedCalendarTasks), []);
});
