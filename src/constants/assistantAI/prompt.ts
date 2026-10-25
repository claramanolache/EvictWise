import documentPrompts from "../../../server/document-prompts.json";
import { Message } from "@/types";

const initialMessageContent = `
Hi there! I'm Alex, and I'm here to help out with any questions related to your housing and rent details! What can I help you with?
- Explain some of your documents.
- What are the upcoming deadlines for me?`;
export const initialMessage: Message = {
  type: "chat",
  id: "",
  role: "assistant",
  content: initialMessageContent,
};

export { default as systemPrompt } from "../../../server/rag/system-prompt.json";

export const extractEventsPrompt = documentPrompts.extractEventsPrompt;

export const condensedInfoPrompt = documentPrompts.condensedInfoPrompt;
