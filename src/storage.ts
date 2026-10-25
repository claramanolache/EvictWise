// Same account-keyed web storage as before, but fail writes explicitly when
// storage is blocked instead of reporting success through a no-op adapter.
export default {
  async getItem(key: string): Promise<string | null> {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!globalThis.localStorage) throw new Error('Browser storage is unavailable');
    globalThis.localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (!globalThis.localStorage) throw new Error('Browser storage is unavailable');
    globalThis.localStorage.removeItem(key);
  },
};
