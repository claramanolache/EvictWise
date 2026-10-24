require('dotenv').config({ path: require('node:path').join(__dirname, '../server/.env'), quiet: true });
const { createClient } = require('../server/rag/client.cjs');
const { openIndex, rebuild, embed } = require('../server/rag/index.cjs');
const { rebuildTextIndex } = require('../server/rag/text-search.cjs');
async function main() {
  const db = openIndex();
  try {
    const textChunks = await rebuildTextIndex(db);
    console.log(`Text search ready: ${textChunks} passages.`);
    if (process.argv.includes('--text-only')) return;
    const client = createClient();
    const result = await rebuild({ db, embedTexts: texts => {
      return embed(client, texts);
    } });
    console.log(JSON.stringify(result));
    if (!result.chunks) console.log('No legal documents indexed. Add .txt, .md, or text-based .pdf files to src/legal_knowlege, then run npm run rag:index.');
  } finally { db.close(); }
}
main().catch(error => { console.error('Indexing failed:', error.message); process.exitCode = 1; });
