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

const { scheduleChecklist, deadlineDay } = load('utils/calendarChecklist.ts');
const { setCalendarTaskPriority, validCalendarPriority, removeEventById } = load('slice.ts');
const config = (importance = 1, effort = 0.5, dependsOn = []) => ({ importance, effort, dependsOn });
const at = (year, month, day) => new Date(year, month, day, 12);

test('uses the exact weighted formula with normalized urgency, dependency impact and effort', () => {
  const events = ['a','b','c','d'].map(id => event(id,[2026,9,26]));
  const settings = { a:config(0.8,0.2), b:config(1,0.5,['a']), c:config(1,0.5,['a']), d:config(1,0.5,['a']) };
  const a = scheduleChecklist(events,new Set(),settings,at(2026,9,25)).find(row=>row.task.id==='a');
  assert.equal(a.urgency,0.875); assert.equal(a.dependencyImpact,1);assert.equal(a.unlocks,3);
  assert.equal(a.score,40*0.8+50*0.875+10-10*0.2);
  assert.equal(a.score,83.75);
});
test('time passing can reorder tasks; date-only urgency handles today, overdue and invalid dates', () => {
  const events = [event('soon',[2026,10,1]),event('important',[2026,10,22])];
  const settings = { soon:config(0.5,0.5),important:config(1,0.5) };
  assert.equal(scheduleChecklist(events,new Set(),settings,at(2026,9,1))[0].task.id,'important');
  assert.equal(scheduleChecklist(events,new Set(),settings,at(2026,10,1))[0].task.id,'soon');
  assert.equal(scheduleChecklist(events,new Set(),settings,at(2026,10,2)).find(r=>r.task.id==='soon').urgency,1);
  assert.equal(deadlineDay([2026,1,30]),null);
  const unknown = scheduleChecklist([event('bad',[2026,1,30])],new Set(),{},at(2026,9,25))[0];
  assert.equal(unknown.daysRemaining,null);assert.equal(unknown.urgency,0);assert.ok(Number.isFinite(unknown.score));
  assert.equal(deadlineDay([2026,2,9])-deadlineDay([2026,2,8]),1);
});
test('only directly unlocked unfinished tasks count; completion and undo recompute dependencies', () => {
  const events = ['a','b','c','d','e'].map(id=>event(id,[2026,9,26]));
  const settings = { b:config(1,0.5,['a']), c:config(1,0.5,['a','d']), e:config(1,0.5,['b']) };
  const pending = scheduleChecklist(events,new Set(),settings,at(2026,9,25));
  assert.equal(pending.find(r=>r.task.id==='a').unlocks,1);
  assert.equal(scheduleChecklist(events,new Set(['d']),settings,at(2026,9,25)).find(r=>r.task.id==='a').unlocks,2);
  const done = scheduleChecklist(events,new Set(['a']),settings,at(2026,9,25));
  assert.equal(done.find(r=>r.task.id==='b').blocked,false);
  assert.equal(done.find(r=>r.task.id==='c').blocked,true);
  assert.equal(done.at(-1).task.id,'a');
  assert.equal(scheduleChecklist(events,new Set(),settings,at(2026,9,25)).find(r=>r.task.id==='b').blocked,true);
});
test('dependency impact caps at one, unknown prerequisites stay blocked, and old settings get defaults',()=>{
 const events=Array.from({length:6},(_,i)=>event(String(i),[2026,9,26]));
 const settings=Object.fromEntries(events.slice(1).map(e=>[e.id,config(1,0.5,['0'])]));
 assert.equal(scheduleChecklist(events,new Set(),settings,at(2026,9,25))[0].dependencyImpact,1);
 const row=scheduleChecklist([events[0]],new Set(['missing']),{'0':config(1,0.5,['missing'])},at(2026,9,25))[0];
 assert.equal(row.blocked,true);
 const fallback=scheduleChecklist([events[0]],new Set(),{'0':{importance:NaN,effort:Infinity,dependsOn:[]}},at(2026,9,25))[0];
 assert.equal(fallback.importance,1);assert.equal(fallback.effort,0.5);
});
test('planning edits persist without changing events; invalid values and cycles are rejected',()=>{
 let state={...reducer(undefined,{type:'init'}),events:['a','b','c'].map(id=>event(id,[2026,9,26]))};
 const before=state.events;
 state=reducer(state,setCalendarTaskPriority({id:'a',priority:config(0.7,0.2,['b'])}));
 state=reducer(state,setCalendarTaskPriority({id:'b',priority:config(0.8,0.4,['c'])}));
 assert.equal(state.events,before);
 const restored=normalize(state);assert.equal(restored.calendarTaskPriorities.a.importance,0.7);
 assert.equal(validCalendarPriority(state.events,state.calendarTaskPriorities,'c',config(1,0.5,['a'])),false);
 for(const [id,priority] of [['c',config(1,0.5,['a'])],['a',config(1,0.5,['a'])],['a',config(1,0.5,['missing'])],['a',config(2,0.5)],['a',config(1,NaN)]]) {
   assert.equal(reducer(state,setCalendarTaskPriority({id,priority})),state);
 }
 state=reducer(state,removeEventById('b'));
 assert.equal(state.calendarTaskPriorities.b,undefined);
 assert.equal(scheduleChecklist(state.events,new Set(),state.calendarTaskPriorities,at(2026,9,25)).find(r=>r.task.id==='a').blocked,true);
 assert.deepEqual(normalize(reducer(state,clearEvents()).calendarTaskPriorities),{});
});
