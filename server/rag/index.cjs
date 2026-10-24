const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { EMBEDDING_MODEL: MODEL } = require('./client.cjs');
const DB_PATH = path.resolve(__dirname, '../private/legal-index-gemini.sqlite3');
const KNOWLEDGE_PATH = process.env.RAG_KNOWLEDGE_PATH ? path.resolve(process.env.RAG_KNOWLEDGE_PATH) : path.resolve(__dirname, '../../src/legal_knowlege');
const hash = text => createHash('sha256').update(text).digest('hex');
function openIndex(filename = DB_PATH) {
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  fs.chmodSync(filename, 0o600);
  db.exec(`PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS chunks (id TEXT PRIMARY KEY, file TEXT, page INTEGER, part INTEGER, text TEXT, vector TEXT); CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);`);
  return db;
}
function chunks(text, size = 1800, overlap = 250) {
  if (size <= overlap || overlap < 0) throw new Error('Invalid chunk size');
  const result = [];
  text = text.replace(/\r\n/g, '\n').trim();
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end);
      if (boundary > start + size / 2) end = boundary;
    }
    result.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return result;
}
async function readDocuments(root) {
  const records = [];
  async function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(filename); continue; }
      const extension = path.extname(filename).toLowerCase();
      if (!['.txt', '.md', '.pdf'].includes(extension) || filename === path.join(root, 'README.md')) continue;
      if (fs.statSync(filename).size > 25 * 1024 * 1024) throw new Error(`File exceeds 25 MB: ${entry.name}`);
      const file = path.relative(root, filename).split(path.sep).join('/');
      const metadataFile = filename + '.source.json';
      const metadata = fs.existsSync(metadataFile) ? JSON.parse(fs.readFileSync(metadataFile, 'utf8')) : null;
      const provenance = metadata ? `Source: ${metadata.title}\nURL: ${metadata.resolved_url}\nJurisdiction: ${metadata.jurisdiction}\nRetrieved: ${metadata.retrieved_at} (not verification of effective date)\n\n` : '';
      let pages;
      if (extension === '.pdf') {
        const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(filename)), useSystemFonts: true, isEvalSupported: false }).promise;
        pages = [];
        try {
          for (let page = 1; page <= pdf.numPages; page++) {
            const content = await (await pdf.getPage(page)).getTextContent();
            const text = content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
            if (!text.trim()) throw new Error(`PDF has an unreadable page: ${file}, page ${page}. Run OCR first.`);
            pages.push({ text, page });
          }
        } finally { await pdf.destroy(); }
      } else {
        const text = fs.readFileSync(filename, 'utf8');
        // Catalog records describe links, not the actual underlying legal authority.
        if (/^content_status:\s*["']?source-reference-only["']?\s*$/m.test(text)) continue;
        pages = [{ text, page: null }];
      }
      for (const { text, page } of pages) chunks(text).map(text => provenance + text).forEach((text, part) => records.push({ id: hash(JSON.stringify([file, page, part, text])), file, page, part: part + 1, text }));
    }
  }
  await walk(root);
  return records;
}
function validateVector(vector, dimension) {
  if (!Array.isArray(vector) || !vector.length || (dimension && vector.length !== dimension) || vector.some(n => !Number.isFinite(n)) || !vector.some(n => n !== 0)) throw new Error('Invalid embedding dimensions or values');
  return vector;
}
async function embed(client, texts, model = MODEL) {
  const response = await client.embeddings.create({ model, input: texts, encoding_format: 'float' });
  // Gemini's compatibility API may omit the protobuf default index (zero).
  const data = response.data.map(item => ({ ...item, index: item.index ?? 0 })).sort((a,b) => a.index - b.index);
  if (data.length !== texts.length || data.some((item,i) => item.index !== i)) throw new Error('Incomplete embeddings response');
  return data.map(item => validateVector(item.embedding));
}
async function rebuild({ db, root = KNOWLEDGE_PATH, embedTexts, model = MODEL }) {
  const records = await readDocuments(root);
  const oldModel = db.prepare("SELECT value FROM settings WHERE key='model'").get()?.value;
  const existing = new Map(oldModel === model ? db.prepare('SELECT id, vector FROM chunks').all().map(row => [row.id, row.vector]) : []);
  let embedded = 0, dimension;
  for (let i = 0; i < records.length; i += 32) {
    const batch = records.slice(i, i + 32), missing = batch.filter(row => !existing.has(row.id));
    if (missing.length) {
      const vectors = await embedTexts(missing.map(row => row.text));
      if (vectors.length !== missing.length) throw new Error('Incomplete embeddings');
      missing.forEach((row,j) => existing.set(row.id, JSON.stringify(validateVector(vectors[j]))));
      embedded += missing.length;
    }
    for (const row of batch) {
      row.vector = existing.get(row.id);
      const vector = validateVector(JSON.parse(row.vector), dimension);
      dimension ??= vector.length;
    }
  }
  // Publish only a complete snapshot; failed extraction/embedding leaves the old index intact.
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM chunks');
    const insert = db.prepare('INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?)');
    for (const row of records) insert.run(row.id, row.file, row.page, row.part, row.text, row.vector);
    const setting = db.prepare('INSERT OR REPLACE INTO settings VALUES (?, ?)');
    for (const [key,value] of Object.entries({ model, dimension: dimension || 0, updatedAt: new Date().toISOString() })) setting.run(key, String(value));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { files: new Set(records.map(row => row.file)).size, chunks: records.length, embedded };
}
function search(db, vector, { model = MODEL, limit = 6, minScore = 0.25 } = {}) {
  const settings = Object.fromEntries(db.prepare('SELECT * FROM settings').all().map(row => [row.key,row.value]));
  if (settings.model !== model) throw new Error('Embedding model changed. Rebuild the legal index.');
  validateVector(vector, Number(settings.dimension));
  const norm = Math.hypot(...vector);
  return db.prepare('SELECT * FROM chunks').all().map(row => {
    const stored = validateVector(JSON.parse(row.vector), vector.length);
    const score = stored.reduce((sum,n,i) => sum + n * vector[i], 0) / (norm * Math.hypot(...stored));
    const { vector: ignored, ...source } = row;
    return { ...source, score };
  }).filter(row => row.score >= minScore).sort((a,b) => b.score - a.score).slice(0,limit);
}
module.exports = { MODEL, DB_PATH, KNOWLEDGE_PATH, openIndex, chunks, readDocuments, embed, rebuild, search };
