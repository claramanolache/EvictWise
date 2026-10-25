const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomBytes}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {maximizeCompatibility}=require('./assignment.cjs');
const {loadKey,encrypt,decrypt,createUserDatabase,readUsers}=require('./user-store.cjs');
const {makeUsers,capacities}=require('./demo-data.cjs');
const {readOrganizations}=require('./organizations.cjs');
const {matchDemoUsers}=require('./run.cjs');
const {rankLawyers}=require('../../src/utils/lawyerRecommendations.ts');
const capacity=(id,slots=1)=>({organizationId:id,slots});
const edge=(userId,organizationId,score)=>({userId,organizationId,score});
test('global allocation reroutes a greedy choice to maximize compatibility',()=>{
 const result=maximizeCompatibility(['a','b'],[capacity('x'),capacity('y')],[edge('a','x',90),edge('a','y',89),edge('b','x',88)]);
 assert.equal(result.totalCompatibility,177);
 assert.deepEqual(result.assignments.map(a=>[a.userId,a.organizationId]),[['a','y'],['b','x']]);
});
test('finite capacities, missing edges, zero capacities and unmatched users are respected',()=>{
 const result=maximizeCompatibility(['a','b','c','d'],[capacity('x',2),capacity('y',0)],[edge('a','x',90),edge('b','x',80),edge('c','x',70),edge('d','y',100)]);
 assert.equal(result.assignments.length,2);assert.deepEqual(result.unmatched,['c','d']);assert.equal(result.capacityUsage[1].assigned,0);
 assert.equal(maximizeCompatibility([],[],[]).totalCompatibility,0);
 assert.equal(maximizeCompatibility(['a'],[capacity('x')],[]).assignments.length,0);
});
test('objective is total compatibility rather than forcing the largest number of matches',()=>{
 const result=maximizeCompatibility(['a','b'],[capacity('x'),capacity('y')],[edge('a','x',100),edge('a','y',1),edge('b','x',1)]);
 assert.equal(result.totalCompatibility,100);assert.equal(result.assignments.length,1);
});
test('invalid graph inputs fail closed',()=>{
 for(const args of [ [['a','a'],[],[]], [['a'],[capacity('x',-1)],[]], [['a'],[capacity('x',1.5)],[]], [['a'],[capacity('x')],[edge('a','x',NaN)]], [['a'],[capacity('x')],[edge('a','z',10)]], [['a'],[capacity('x')],[edge('a','x',1),edge('a','x',2)]] ]) assert.throws(()=>maximizeCompatibility(...args));
});
test('solver matches an exhaustive optimum over 80 small deterministic graphs',()=>{
 let seed=12345;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
 for(let trial=0;trial<80;trial++) {
  const users=['a','b','c','d'];const caps=[capacity('x',rand(3)),capacity('y',rand(3)),capacity('z',rand(3))];
  const edges=users.flatMap(u=>caps.flatMap(c=>rand(3)?[edge(u,c.organizationId,rand(101))]:[]));
  function optimum(i,remaining) {if(i===users.length)return 0;let best=optimum(i+1,remaining);for(const e of edges.filter(e=>e.userId===users[i])) {const j=caps.findIndex(c=>c.organizationId===e.organizationId);if(remaining[j]>0){const next=[...remaining];next[j]--;best=Math.max(best,e.score+optimum(i+1,next));}}return best;}
  const result=maximizeCompatibility(users,caps,edges);assert.equal(result.totalCompatibility,optimum(0,caps.map(c=>c.slots)));
  assert.deepEqual(result,maximizeCompatibility([...users].reverse(),[...caps].reverse(),[...edges].reverse()));
 }
});
test('AES-GCM encrypts user data and authenticates ciphertext and row identity',()=>{
 const key=randomBytes(32),user=makeUsers()[0];const encrypted=encrypt(user,key,'one');
 assert.deepEqual(decrypt({id:'one',...encrypted},key),user);
 assert.notDeepEqual(encrypted.nonce,encrypt(user,key,'one').nonce);
 assert.throws(()=>decrypt({id:'one',...encrypted},randomBytes(32)));
 assert.throws(()=>decrypt({id:'other',...encrypted},key));
 const changed=Buffer.from(encrypted.ciphertext);changed[0]^=1;
 assert.throws(()=>decrypt({id:'one',...encrypted,ciphertext:changed},key));
 assert.throws(()=>encrypt({...user,synthetic:false},key,'one'));
});
test('SQLite contains encrypted profiles only, refuses overwrite, and uses a separate private key',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'evictwise-matching-'));const file=path.join(directory,'users.sqlite3'),keyFile=path.join(directory,'key');
 try {
  const key=loadKey(keyFile,{create:true});const users=makeUsers();createUserDatabase(file,key,users);
  assert.deepEqual(readUsers(file,key),users);assert.throws(()=>createUserDatabase(file,key,users));
  const bytes=fs.readFileSync(file);assert.equal(bytes.includes(Buffer.from('Fictional Tenant')),false);assert.equal(bytes.includes(Buffer.from('Palo Alto')),false);assert.equal(bytes.includes(key),false);
  assert.equal(fs.statSync(file).mode&0o777,0o600);assert.equal(fs.statSync(keyFile).mode&0o777,0o600);
  const db=new DatabaseSync(file);try{db.prepare('UPDATE encrypted_demo_users SET tag=? WHERE id=(SELECT id FROM encrypted_demo_users LIMIT 1)').run(randomBytes(16));}finally{db.close();}
  assert.throws(()=>readUsers(file,key));
 } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('demo uses actual SQL directory and unchanged live scoring, and never writes provider data',()=>{
 const file=path.resolve(__dirname,'../../data/lawyers.sqlite3'),before=fs.readFileSync(file);
 const organizations=readOrganizations(file),users=makeUsers(),result=matchDemoUsers(users,organizations,capacities);
 assert.equal(result.liveEnabled,false);assert.equal(result.userCount,12);assert.equal(result.assignments.length,8);assert.equal(result.unmatched.length,4);
 assert.ok(result.capacityUsage.every(c=>c.assigned<=c.slots));assert.equal(new Set(result.assignments.map(a=>a.userId)).size,result.assignments.length);
 for(const assignment of result.assignments){const user=users.find(u=>u.id===assignment.userId);const expected=rankLawyers(organizations,user.preferences,user.location,user.preferredLanguage).find(r=>r.organization.id===assignment.organizationId);assert.ok(expected.serviceMatch);assert.ok(Math.abs(expected.rawScore-assignment.score)<=0.0000005);}
 assert.deepEqual(fs.readFileSync(file),before);
 assert.throws(()=>matchDemoUsers([{...users[0],synthetic:false}],organizations,capacities));
 assert.throws(()=>matchDemoUsers(users,organizations,capacities.slice(1)));
});
