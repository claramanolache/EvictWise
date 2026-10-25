import { Zip, ZipPassThrough, strToU8 } from 'fflate';
import type { FileData } from '../types';

export class MissingCaseFileError extends Error {
  constructor(public fileName: string) { super('An uploaded original could not be included'); }
}

function safeName(name: string): string {
  return (name.split(/[\\/]/).pop() || 'uploaded-file').replace(/[\x00-\x1f\x7f<>:"|?*]/g, '_').replace(/[. ]+$/g, '').slice(0, 180) || 'uploaded-file';
}

// ZIP entry order and numbered names both put the canonical English summary first.
// Read only the originals referenced by this account's current profile.
export async function buildCaseArchive(report: string, files: FileData[], readOriginal: (id: string) => Promise<Uint8Array>): Promise<Uint8Array> {
  if (!report.trim()) throw new Error('Case summary is not ready');
  if (files.length >= 65535) throw new Error('Too many files for a ZIP archive');
  const chunks: Uint8Array[] = [];
  let error: Error | null = null;
  let ended = false;
  const zip = new Zip((failure, chunk, final) => {
    if (failure) error = failure;
    else if (chunk) chunks.push(chunk);
    if (final) ended = true;
  });
  const width = Math.max(4, String(files.length).length);
  let size = 0;
  function add(name: string, bytes: Uint8Array) {
    size += bytes.byteLength + strToU8(name).length * 2 + 128;
    if (size >= 0xffffffff) throw new Error('Archive exceeds ZIP size limit');
    const entry = new ZipPassThrough(name);
    zip.add(entry);
    entry.push(bytes, true);
    if (error) throw error;
  }
  try {
    add(`${'0'.repeat(width)}-case-summary.txt`, strToU8(report));
    for (let index = 0; index < files.length; index++) {
      const file = files[index]!;
      if (!file.originalFileId) throw new MissingCaseFileError(file.name);
      let bytes: Uint8Array;
      try { bytes = await readOriginal(file.originalFileId); }
      catch { throw new MissingCaseFileError(file.name); }
      add(`${String(index + 1).padStart(width, '0')}-${safeName(file.name)}`, bytes);
    }
    zip.end();
    if (error) throw error;
    if (!ended) throw new Error('Incomplete ZIP archive');
    const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  } catch (failure) { zip.terminate(); throw failure; }
}
