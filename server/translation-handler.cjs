const { budget, safeError } = require('./security.cjs');
const languages = new Set(['en','es','fr','de','it','pt','ro','ja','ko','zh-CN']);
function createTranslationHandler(client, project, origin) {
  const perIp = budget(200000), global = budget(1000000);
  let active = 0;
  return async (req, res) => {
    if (req.get('origin') && req.get('origin') !== origin) return res.status(403).json({ error: 'Forbidden origin.' });
    if (!req.is('application/json')) return res.status(415).json({ error: 'JSON is required.' });
    const { texts, text, targetLanguage, sourceLanguage = 'auto' } = req.body || {};
    const input = Array.isArray(texts) ? texts : typeof text === 'string' ? [text] : [];
    if (!input.length || input.length > 1000 || input.some(t => typeof t !== 'string' || t.length > 30000) ||
        !languages.has(targetLanguage) || !(sourceLanguage === 'auto' || languages.has(sourceLanguage)))
      return res.status(400).json({ error: 'Invalid translation request.' });
    const chars = input.reduce((n, t) => n + t.length, 0);
    if (chars > 30000) return res.status(413).json({ error: 'Translation request is too large.' });
    if (!perIp(req.ip || 'unknown', Math.max(chars, 1000)) || !global('all', Math.max(chars, 1000)) || active >= 4) {
      res.set('Retry-After', '900'); return res.status(429).json({ error: 'Translation limit reached. Try again later.' });
    }
    if (sourceLanguage === targetLanguage) return res.json({ translations: input.map(translatedText => ({ translatedText, detectedLanguageCode: sourceLanguage })) });
    if (!project) return res.status(503).json({ error: 'Translation service is unavailable.' });
    active++;
    try {
      const [response] = await client.translateText({ parent: `projects/${project}/locations/global`, contents: input, mimeType: 'text/plain', targetLanguageCode: targetLanguage, ...(sourceLanguage === 'auto' ? {} : { sourceLanguageCode: sourceLanguage }) }, { timeout: 15000, retry: null });
      if (!Array.isArray(response.translations) || response.translations.length !== input.length) throw new Error('Invalid response');
      res.json({ translations: response.translations.map(t => ({ translatedText: t.translatedText, detectedLanguageCode: t.detectedLanguageCode || null })) });
    } catch { safeError('translation_provider_failure', req); res.status(503).json({ error: 'Translation is temporarily unavailable. Please try again.', requestId: req.requestId }); }
    finally { active--; }
  };
}
module.exports = { createTranslationHandler };
