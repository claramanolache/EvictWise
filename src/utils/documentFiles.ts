import { Platform } from "react-native";
import type { DocumentPickerAsset } from "expo-document-picker";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("evictwise-documents", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOriginalFile(asset: DocumentPickerAsset, mimeType: string): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (Platform.OS !== "web") {
    const { File, Paths } = await import("expo-file-system");
    const extension = asset.name.match(/\.([a-zA-Z0-9]{1,12})$/)?.[1] || "bin";
    const destination = new File(Paths.document, `${id}.${extension}`);
    new File(asset.uri).copy(destination);
    return destination.uri;
  }
  const original = asset.file ?? await (await fetch(asset.uri)).blob();
  const blob = new Blob([original], { type: mimeType });
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return id;
}

export async function loadOriginalFile(id: string): Promise<string> {
  if (Platform.OS !== "web") return id;
  const db = await openDatabase();
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const request = db.transaction("files").objectStore("files").get(id);
      request.onsuccess = () => request.result instanceof Blob
        ? resolve(request.result) : reject(new Error("Original file unavailable"));
      request.onerror = () => reject(request.error);
    });
    return URL.createObjectURL(blob);
  } finally {
    db.close();
  }
}

export async function removeOriginalFile(id: string): Promise<void> {
  if (Platform.OS !== "web") {
    const { File } = await import("expo-file-system");
    const file = new File(id);
    if (file.exists) file.delete();
    return;
  }
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
