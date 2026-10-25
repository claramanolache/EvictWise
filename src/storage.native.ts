// App-private device storage for Redux on native. redux-persist's browser
// localStorage adapter otherwise becomes a no-op on iOS/Android.
async function fileForKey(key: string) {
  const { File, Paths, Directory } = await import('expo-file-system');
  const directory = new Directory(Paths.document, 'account-state');
  directory.create({ intermediates: true, idempotent: true });
  return new File(directory, `${encodeURIComponent(key)}.json`);
}
export default {
  async getItem(key: string): Promise<string | null> { const file = await fileForKey(key); return file.exists ? file.text() : null; },
  async setItem(key: string, value: string): Promise<void> { const file = await fileForKey(key); file.create({ overwrite: true }); file.write(value); },
  async removeItem(key: string): Promise<void> { const file = await fileForKey(key); if (file.exists) file.delete(); },
};
