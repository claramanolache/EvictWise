import OpenAI from "openai";

export type ErrorMessage = {
  type: "error";
  id: string;
  error: string;
};

export type ChatMessage = {
  type: "chat";
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type LoadingMessage = {
  type: "loading";
  id: string;
};

export type Message = ErrorMessage | ChatMessage | LoadingMessage;

export const serializeMessage = (
  msg: Message,
): OpenAI.Chat.Completions.ChatCompletionMessageParam | null => {
  if (msg.type === "error") return null;
  if (msg.type === "chat")
    return {
      role: msg.role,
      content: msg.content,
    };
  return null;
};

export const serializeMessages = (
  msgs: Message[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  return msgs.map((msg) => serializeMessage(msg)).filter((msg) => !!msg);
};

export type FileData = {
  name: string;
  markdown: string;
};

export type CrudeDate = [number, number, number];

export type RawEvent = {
  date: CrudeDate;
  deltaDays: number;
  name: string;
  type: "court" | "payment" | "house";
};

export type CalendarEvent = Omit<RawEvent, "deltaDays"> & {
  id: string;
  document: "eviction" | "lease";
};
