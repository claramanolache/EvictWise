import { Platform } from 'react-native';

export async function downloadCaseArchive(bytes: Uint8Array): Promise<void> {
  const name = 'all-case-info.zip';
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable');
  const file = new File(Paths.cache, `case-${Date.now()}-${name}`);
  try {
    file.create({ overwrite: true });
    file.write(bytes);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: name });
  } finally { if (file.exists) file.delete(); }
}
