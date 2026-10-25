require('dotenv').config({ path: require('node:path').join(__dirname, '../server/.env'), quiet: true });
const { createClient } = require('../server/rag/client.cjs');
const { openIndex, rebuild, embed, readDocuments, KNOWLEDGE_PATH } = require('../server/rag/index.cjs');
const { rebuildTextIndex } = require('../server/rag/text-search.cjs');
async function main() {
  const db = openIndex();
  try {
    const records = await readDocuments(KNOWLEDGE_PATH);
    const textChunks = await rebuildTextIndex(db, KNOWLEDGE_PATH, records);
    console.log(`Text search ready: ${textChunks} passages.`);
    if (process.argv.includes('--text-only')) return;
    const client = createClient();
    const result = await rebuild({ db, records,
      onProgress: ({completed,total,embedded}) => console.log(`Embedding progress: ${completed}/${total}; ${embedded} new.`),
      embedTexts: texts => require('../server/rag/retry.cjs').withQuotaRetry(() => embed(client, texts)),
    });
    console.log(JSON.stringify(result));
    if (!result.chunks) console.log('No legal documents indexed. Add .txt, .md, or text-based .pdf files to src/legal_knowlege, then run npm run rag:index.');
  } finally { db.close(); }
}
main().catch(error => { console.error('Indexing failed:', error.message); process.exitCode = 1; });
