const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function transpile(file) { return ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText; }
test('mounted checklist refreshes with time and foreground events and cleans up listeners',()=>{
 const helper={};vm.runInNewContext(transpile('src/utils/calendarChecklist.ts'),{exports:helper});
 let instant=new Date(2026,9,1,12), cursor=0;
 const slots=[],timers=new Map(),effects=[],listeners=new Map(),browser=new Map(),actions=[];
 const state={events:[{id:'soon',name:'Soon',type:'court',date:[2026,10,1],document:'eviction'},{id:'important',name:'Important',type:'court',date:[2026,10,22],document:'lease'}],completedCalendarTasks:[],calendarTaskPriorities:{soon:{importance:0.5,effort:0.5,dependsOn:[]}}};
 const mocks={
  react:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=value;}];},useEffect(fn){const i=cursor++;if(!(i in slots)){slots[i]=true;effects.push(fn());}}},
  'react-native':{Text:'Text',View:'View',ScrollView:'ScrollView',Pressable:'Pressable',AppState:{addEventListener(name,fn){listeners.set(name,fn);return {remove:()=>listeners.delete(name)};}}},
  'react-redux':{useSelector:fn=>fn({app:state}),useDispatch:()=>action=>actions.push(action)},
  '@/context/ThemeContext':{useAppColorScheme:()=> 'dark'},'@/Translation/TranslationContext':{useTranslation:()=>({language:'en',t:key=>key})},
  '@/constants/theme':{getTheme:()=>({})},'@/slice':{toggleCalendarTask:id=>({id})},'@/utils/calendarChecklist':helper,
  './CalendarPriorityEditor':{default:'Editor'},'@react-native-vector-icons/fontawesome-free-solid':{default:'Icon'},
 };
 const output={};
 vm.runInNewContext(transpile('src/components/PriorityChecklist.tsx'),{exports:output,require:name=>mocks[name]??require(name),
  Date:class extends Date{constructor(...args){super(...(args.length?args:[instant.getTime()]));}},
  setInterval:fn=>{timers.set(1,fn);return 1;},clearInterval:id=>timers.delete(id),
  window:{addEventListener:(name,fn)=>browser.set(name,fn),removeEventListener:name=>browser.delete(name)},
  document:{addEventListener:(name,fn)=>browser.set(name,fn),removeEventListener:name=>browser.delete(name)},
 });
 const flatten=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(flatten):[node,...flatten(node.props?.children)];
 const render=()=>{cursor=0;return flatten(output.default());};
 const boxes=()=>render().filter(node=>node.type==='Pressable'&&node.props.accessibilityRole==='checkbox');
 assert.match(boxes()[0].props.accessibilityLabel,/Important/);
 instant=new Date(2026,10,1,12);timers.get(1)();assert.match(boxes()[0].props.accessibilityLabel,/Soon/);
 instant=new Date(2026,9,1,12);listeners.get('change')('active');assert.match(boxes()[0].props.accessibilityLabel,/Important/);
 instant=new Date(2026,10,1,12);browser.get('focus')();assert.match(boxes()[0].props.accessibilityLabel,/Soon/);
 boxes()[0].props.onPress();assert.equal(actions[0].id,'soon');
 effects.forEach(cleanup=>cleanup());assert.equal(timers.size,0);assert.equal(listeners.size,0);assert.equal(browser.size,0);
});
