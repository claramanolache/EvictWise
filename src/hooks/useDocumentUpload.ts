import { saveOriginalFile } from "@/utils/documentFiles";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import * as DocumentPicker from "expo-document-picker";
import { documentRequest } from "@/auth/api";
import { validFile } from "../../server/file-validation.cjs";
import { Platform } from "react-native";
import { parsePdfToMarkdown } from "@/pdf";
import { addEvent, clearEventsByDocument } from "@/slice";
import { CalendarEvent, FileData, RawEvent } from "@/types";

export function useDocumentUpload() {
  const dispatch = useDispatch();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorKey, setErrorKey] = useState("documentUploadFailed");

  async function upload(
    document: CalendarEvent["document"],
    save: (file: FileData) => void,
  ) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) throw new Error("documentUploadFailed");
      const extension = asset.name.split(".").pop()?.toLowerCase();
      const mimeType = asset.mimeType && asset.mimeType !== "application/octet-stream"
        ? asset.mimeType.toLowerCase()
        : ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[extension || ""];
      if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        throw new Error("documentUnsupportedFormat");
      }
      if ((asset.size ?? asset.file?.size ?? 0) > 20 * 1024 * 1024) {
        throw new Error("documentTooLarge");
      }
      const bytes = Platform.OS === "web"
        ? new Uint8Array(await (asset.file ?? await (await fetch(asset.uri)).blob()).arrayBuffer())
        : await new (await import("expo-file-system")).File(asset.uri).bytes();
      if (!validFile(bytes, mimeType)) throw new Error("documentUnsupportedFormat");
      let markdown: string;
      if (mimeType === "application/pdf") {
        const file = asset.file ?? await (await fetch(asset.uri)).blob();
        markdown = await parsePdfToMarkdown(file);
      } else {
        let imageUrl: string;
        if (Platform.OS !== "web") {
          const { File } = await import("expo-file-system");
          imageUrl = `data:${mimeType};base64,${await new File(asset.uri).base64()}`;
        } else {
          const file = asset.file ?? await (await fetch(asset.uri)).blob();
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = String(reader.result).split(",")[1];
              if (!base64) return reject(new Error("documentUploadFailed"));
              resolve(`data:${mimeType};base64,${base64}`);
            };
            reader.onerror = () => reject(new Error("documentUploadFailed"));
            reader.onabort = () => reject(new Error("documentUploadFailed"));
            reader.readAsDataURL(file);
          });
        }
        markdown = await documentRequest({ operation: "transcribe", image: imageUrl });
      }
      if (!markdown.trim()) throw new Error("documentUnreadable");
      const rawEvents = JSON.parse(await documentRequest({ operation: "events", text: markdown })) as RawEvent[];
      if (!Array.isArray(rawEvents)) throw new Error("documentUploadFailed");
      const events: CalendarEvent[] = rawEvents.map((event) => {
        if (!Array.isArray(event.date) || event.date.length !== 3 ||
            !event.date.every(Number.isInteger) || !Number.isInteger(event.deltaDays) ||
            typeof event.name !== "string" || !["court", "payment", "house"].includes(event.type)) {
          throw new Error("documentUploadFailed");
        }
        const [year, month, day] = event.date;
        // The extractor returns months 1–12; JavaScript and the calendar use 0–11.
        const sourceDate = new Date(year, month - 1, day);
        if (sourceDate.getFullYear() !== year || sourceDate.getMonth() !== month - 1 || sourceDate.getDate() !== day) {
          throw new Error("documentUploadFailed");
        }
        const date = new Date(sourceDate);
        date.setDate(date.getDate() + event.deltaDays);
        if (!Number.isFinite(date.getTime())) throw new Error("Invalid event date");
        return {
          id: String(Math.random()),
          document,
          date: [date.getFullYear(), date.getMonth(), date.getDate()],
          name: event.name,
          type: event.type,
        };
      });
      // Preserve the existing document and deadlines until processing succeeds.
      const originalFileId = await saveOriginalFile(asset, mimeType);
      save({ name: asset.name, markdown, mimeType, originalFileId });
      dispatch(clearEventsByDocument(document));
      events.forEach((event) => dispatch(addEvent(event)));
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      setErrorKey(["documentUnsupportedFormat", "documentTooLarge", "documentUnreadable"].includes(key) ? key : "documentUploadFailed");
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return { upload, loading, failed, errorKey };
}
