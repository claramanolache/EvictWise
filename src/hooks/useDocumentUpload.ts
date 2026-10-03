import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import * as DocumentPicker from "expo-document-picker";
import OpenAI from "openai";
import { parsePdfToMarkdown } from "@/pdf";
import { extractEventsPrompt } from "@/constants/assistantAI/prompt";
import { addEvent, clearEventsByDocument } from "@/slice";
import { CalendarEvent, FileData, RawEvent } from "@/types";

export function useDocumentUpload() {
  const dispatch = useDispatch();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

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
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0]?.file;
      if (!file) throw new Error("Missing file asset content");
      const markdown = await parsePdfToMarkdown(file);
      const openai = new OpenAI({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: extractEventsPrompt },
          { role: "user", content: markdown },
        ],
        temperature: 0,
        max_tokens: 800,
      });
      const rawEvents = JSON.parse(
        response.choices?.[0]?.message?.content || "",
      ) as RawEvent[];
      const events: CalendarEvent[] = rawEvents.map((event) => {
        const sourceDate = new Date(...event.date);
        const date = new Date(sourceDate.getTime() + event.deltaDays * 86400000);
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
      save({ name: file.name, markdown });
      dispatch(clearEventsByDocument(document));
      events.forEach((event) => dispatch(addEvent(event)));
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return { upload, loading, failed };
}
