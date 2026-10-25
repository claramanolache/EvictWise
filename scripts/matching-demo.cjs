// Explicit local development command only. Never imported by the API or Expo app.
const path=require('node:path');
const fs=require('node:fs');
require('dotenv').config({path:path.join(__dirname,'../server/.env'),quiet:true});
const {loadKey,createUserDatabase,readUsers}=require('../server/matching/user-store.cjs');
const {makeUsers,capacities}=require('../server/matching/demo-data.cjs');
const database=path.join(__dirname,'../server/private/matching-demo.sqlite3');
const keyFile=process.env.MATCHING_DEMO_KEY_PATH || path.join(__dirname,'../server/private/matching-demo.key');
try {
  const args=process.argv.slice(2);
  if(args.length>1 || (args.length===1 && args[0]!=='--seed')) throw new Error('Usage: npm run matching:demo:seed or npm run matching:demo');
  if(args[0]==='--seed') {
    if(fs.existsSync(database)) throw new Error('Demo database already exists; it was not overwritten.');
    const key=loadKey(keyFile,{create:true});
    try {const users=makeUsers();createUserDatabase(database,key,users);console.log(`Created ${users.length} encrypted synthetic profiles. Live matching remains disabled.`);}
    finally {key.fill(0);}
  } else {
    if(!fs.existsSync(database)) throw new Error('Run npm run matching:demo:seed first.');
    const key=loadKey(keyFile);
    try {
      const {readOrganizations}=require('../server/matching/organizations.cjs');
      const {matchDemoUsers}=require('../server/matching/run.cjs');
      const result=matchDemoUsers(readUsers(database,key),readOrganizations(path.join(__dirname,'../data/lawyers.sqlite3')),capacities);
      console.log(JSON.stringify(result,null,2));
    } finally {key.fill(0);}
  }
} catch(error) {
  // Only this offline synthetic-data command emits errors; never print record/key values.
  console.error('Matching demo failed:',error.code==='ENOENT'?'Required local database or encryption key is missing.':error.message);
  process.exitCode=1;
}
