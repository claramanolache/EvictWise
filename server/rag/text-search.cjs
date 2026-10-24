const { readDocuments, KNOWLEDGE_PATH } = require('./index.cjs');
function ensureTextIndex(db) {
  db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS legal_text USING fts5(id UNINDEXED, file UNINDEXED, page UNINDEXED, part UNINDEXED, text UNINDEXED, body, tokenize='porter unicode61')");
}
async function rebuildTextIndex(db, root = KNOWLEDGE_PATH) {
  const records = await readDocuments(root);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DROP TABLE IF EXISTS legal_text');
    ensureTextIndex(db);
    const insert = db.prepare('INSERT INTO legal_text VALUES (?, ?, ?, ?, ?, ?)');
    for (const r of records) insert.run(r.id,r.file,r.page,r.part,r.text,r.text.startsWith('Source: ') ? r.text.slice(r.text.indexOf('\n\n')+2) : r.text);
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
  return records.length;
}
function hasTextIndex(db) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE name='legal_text'").get() && db.prepare('SELECT COUNT(*) AS count FROM legal_text').get().count > 0;
}
function searchText(db, query, limit = 6) {
  if (!hasTextIndex(db)) return [];
  const stop = new Set('a an the i you can could would should do does did how what when where why is are was were be been to of for in on it this that my me user assistant'.split(' '));
  const terms = [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(word=>word.length>2 && !stop.has(word)))].slice(0,40);
  if (!terms.length) return [];
  // FTS syntax is generated from word tokens only; user input never becomes SQL.
  const alternatives = terms.map(term=>'"'+term+'"').join(' OR ');
  const topic = terms.find(term => /^evict/.test(term));
  const expression = topic ? '"'+topic+'" AND ('+alternatives+')' : alternatives;
  return db.prepare('SELECT id,file,page,part,text,bm25(legal_text) AS score FROM legal_text WHERE legal_text MATCH ? ORDER BY score LIMIT ?').all(expression,limit);
}
module.exports = { rebuildTextIndex, hasTextIndex, searchText };
