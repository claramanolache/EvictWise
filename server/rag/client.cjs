// Google supports the existing SDK's request format through its Gemini endpoint.
// The SDK is only a transport here; requests and credentials go to Google.
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'gemini-embedding-001';
const CHAT_MODEL = process.env.RAG_CHAT_MODEL || 'gemini-3.8-flash';
function createClient({ apiKey = process.env.GEMINI_API_KEY, fetch } = {}) {
  if (!apiKey?.trim()) throw new Error('Set GEMINI_API_KEY in server/.env.');
  if (!EMBEDDING_MODEL.startsWith('gemini-') || !CHAT_MODEL.startsWith('gemini-')) {
    throw new Error('Set RAG_EMBEDDING_MODEL and RAG_CHAT_MODEL to Gemini models in server/.env.');
  }
  return new (require('openai').OpenAI)({ apiKey, baseURL: BASE_URL, timeout: 30000, maxRetries: 1, ...(fetch ? { fetch } : {}) });
}
module.exports = { createClient, EMBEDDING_MODEL, CHAT_MODEL, BASE_URL };
