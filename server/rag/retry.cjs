const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// Used by offline indexing only. Interactive chat must not wait through quota windows.
async function withQuotaRetry(operation, { wait = sleep, log = console.log, attempts = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (error.status !== 429 || attempt >= attempts - 1) throw error;
      const header = Number(error.headers?.get?.('retry-after'));
      const seconds = Number(error.message?.match(/retry in ([\d.]+)s/i)?.[1]);
      const delay = Math.ceil(Math.max(1, Math.min(60, header || seconds || 60))) * 1000;
      log(`Embedding quota reached. Retrying in ${delay / 1000}s; completed batches are saved.`);
      await wait(delay);
    }
  }
}
module.exports = { withQuotaRetry };
