// Google supports the existing SDK's request format through its Gemini endpoint.
// The SDK is only a transport here; requests and credentials go to Google.
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'gemini-embedding-001';
const CHAT_MODEL = process.env.RAG_CHAT_MODEL || 'gemini-3.5-flash';
const { OpenAI, APIConnectionError } = require('openai');
function createClient({ apiKey = process.env.GEMINI_API_KEY, fetch } = {}) {
  if (!apiKey?.trim()) throw new Error('Set GEMINI_API_KEY in server/.env.');
  if (!EMBEDDING_MODEL.startsWith('gemini-') || !CHAT_MODEL.startsWith('gemini-')) {
    throw new Error('Set RAG_EMBEDDING_MODEL and RAG_CHAT_MODEL to Gemini models in server/.env.');
  }
  return new OpenAI({ apiKey, baseURL: BASE_URL, timeout: 20000, maxRetries: 0, ...(fetch ? { fetch } : {}) });
}
const FALLBACK_MODEL = process.env.RAG_CHAT_FALLBACK_MODEL ?? 'gemini-3.1-flash-lite';
function isTransient(error) {
  return error instanceof APIConnectionError || error.status === 408 || error.status === 429 || error.status >= 500 ||
    ['APIConnectionError', 'APIConnectionTimeoutError', 'TimeoutError'].includes(error.name);
}
async function generate(client, request, { wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  // Three attempts at most (90 seconds), leaving room for retrieval within the
  // browser's 120-second request limit. Embeddings retain their 20-second limit.
  const attempt = model => client.chat.completions.create({ ...request, model }, { timeout: 30000 });
  try { return await attempt(CHAT_MODEL); }
  catch (error) {
    // Never retry invalid credentials, bad schemas or safety refusals on another model.
    if (!isTransient(error)) throw error;
    // An overloaded model can recover; don't rely solely on another model which
    // may also be unavailable. Quota failures go straight to the fallback.
    if (error.status !== 429) {
      await wait(500);
      try { return await attempt(CHAT_MODEL); }
      catch (retryError) {
        if (!isTransient(retryError)) throw retryError;
        error = retryError;
      }
    }
    if (!FALLBACK_MODEL || FALLBACK_MODEL === CHAT_MODEL) throw error;
    if (!FALLBACK_MODEL.startsWith('gemini-')) throw new Error('Invalid Gemini fallback model');
    return attempt(FALLBACK_MODEL);
  }
}
module.exports = { createClient, EMBEDDING_MODEL, CHAT_MODEL, BASE_URL, generate, isTransient };
