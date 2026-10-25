function sourceFromRow(row, index) {
  // These headers were stored by the indexer, not supplied by the answer model.
  const header = row.text.startsWith('Source: ') ? row.text.split('\n\n', 1)[0] : '';
  const title = header.match(/^Source: (.+)$/m)?.[1] || row.file;
  const candidate = header.match(/^URL: (.+)$/m)?.[1];
  let url = null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) url = parsed.href;
  } catch { /* Locally supplied sources may not have an online original. */ }
  return { id: `S${index+1}`, title, url, file: row.file, page: row.page, part: row.part, excerpt: row.text };
}
function addCitationLinks(content, sources) {
  const byId = new Map(sources.map(source=>[source.id,source]));
  // Discard model-authored citation destinations before applying trusted metadata.
  content = content.replace(/\[(S\d+)\]\([^\n]*?\)/g, '[$1]');
  return content.replace(/\[(S\d+)\]/g, (marker,id) => {
    const source = byId.get(id);
    if (!source) throw new Error('Unknown source citation');
    const destination = source.url || `evictwise-source:${id}`;
    // Angle-bracket destinations preserve URLs containing parentheses.
    return `[${id}](<${destination.replace(/</g,'%3C').replace(/>/g,'%3E')}>)`;
  });
}
module.exports = { sourceFromRow, addCitationLinks };
