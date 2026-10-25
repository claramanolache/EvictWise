const { randomBytes, randomUUID, createCipheriv, createDecipheriv } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
function loadKey(filename, { create = false } = {}) {
  if (create && !fs.existsSync(filename)) {
    fs.mkdirSync(path.dirname(filename), { recursive:true, mode:0o700 });
    fs.writeFileSync(filename,randomBytes(32),{flag:'wx',mode:0o600});
  }
  if (fs.lstatSync(filename).isSymbolicLink()) throw new Error('Key must be a regular private file.');
  const key=fs.readFileSync(filename);
  if(key.length!==32) throw new Error('Matching key must be 32 random bytes.');
  if(process.platform!=='win32' && (fs.statSync(filename).mode & 0o077)) throw new Error('Matching key permissions must be owner-only.');
  return key;
}
function encrypt(user,key,rowId) {
  if(user?.synthetic!==true) throw new Error('Only explicitly synthetic users are accepted.');
  const nonce=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,nonce,{authTagLength:16});
  cipher.setAAD(Buffer.from(`evictwise-matching-demo:v1:${rowId}`));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(user),'utf8'),cipher.final()]);
  return {nonce,ciphertext,tag:cipher.getAuthTag()};
}
function decrypt(row,key) {
  const decipher=createDecipheriv('aes-256-gcm',key,row.nonce,{authTagLength:16});
  decipher.setAAD(Buffer.from(`evictwise-matching-demo:v1:${row.id}`));
  decipher.setAuthTag(row.tag);
  const user=JSON.parse(Buffer.concat([decipher.update(row.ciphertext),decipher.final()]).toString('utf8'));
  if(user?.synthetic!==true) throw new Error('Not a synthetic demo record.');
  return user;
}
function createUserDatabase(filename,key,users) {
  if(!Buffer.isBuffer(key)||key.length!==32) throw new Error('Invalid encryption key.');
  const rows=users.map(user=>{const id=randomUUID();return {id,...encrypt(user,key,id)};});
  fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  // Never replace an existing database or accidentally open the real account database.
  fs.closeSync(fs.openSync(filename,'wx',0o600));
  const db=new DatabaseSync(filename);
  try {
    db.exec(`PRAGMA journal_mode=DELETE;
      CREATE TABLE encrypted_demo_users (id TEXT PRIMARY KEY, nonce BLOB NOT NULL CHECK(length(nonce)=12), ciphertext BLOB NOT NULL, tag BLOB NOT NULL CHECK(length(tag)=16));
      PRAGMA user_version=1; BEGIN IMMEDIATE;`);
    const insert=db.prepare('INSERT INTO encrypted_demo_users VALUES (?,?,?,?)');
    for(const row of rows) insert.run(row.id,row.nonce,row.ciphertext,row.tag);
    db.exec('COMMIT');
  } finally {db.close();}
}
function readUsers(filename,key) {
  const db=new DatabaseSync(filename,{readOnly:true});
  try {
    if(db.prepare('PRAGMA user_version').get().user_version!==1) throw new Error('Unsupported demo database version.');
    return db.prepare('SELECT * FROM encrypted_demo_users').all().map(row=>decrypt(row,key));
  } finally {db.close();}
}
module.exports={loadKey,encrypt,decrypt,createUserDatabase,readUsers};
