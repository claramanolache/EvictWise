import { applyReportEdits } from "@/utils/condensedInfoEdits";
import { condensedInfoPrompt } from "@/constants/assistantAI/prompt";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import OpenAI from "openai";
import { RootState } from "@/store";
import { setUserInfoReport } from "@/slice";
import { formatUserInfo, parseUserInfoDetails, UserInfoDetails } from "@/utils/condensedUserInfo";

interface CondensedInfoContextValue {
  currentReport: string | null;
  busy: boolean;
  failed: boolean;
  setFailed: (failed: boolean) => void;
}
const CondensedInfoContext = createContext<CondensedInfoContextValue | null>(null);

// Keep report generation mounted while the user is chatting or editing any screen.
export function CondensedInfoProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const { messages, location, events, evictionNotice, leaseAgreement, additionalFiles, userInfoEdits, userInfoReport: report } = useSelector((state: RootState) => state.app);
  const source = JSON.stringify({
    reportVersion: 4,
    location, events,
    additionalFiles: (additionalFiles ?? []).map(({ name, markdown, originalFileId }) => ({ name, markdown, originalFileId })),
    evictionNotice: evictionNotice?.markdown || "",
    leaseAgreement: leaseAgreement?.markdown || "",
    conversation: messages.filter((message) => message.type === "chat")
      .map((message) => message.type === "chat" ? { role: message.role, content: message.content } : null),
  });
  const latestSource = useRef(source);
  latestSource.current = source;
  const reportRef = useRef(report);
  reportRef.current = report;
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const currentReport = report?.source === source ? applyReportEdits(report.text, userInfoEdits) : null;

  const generate = useCallback(async () => {
    controller.current?.abort();
    const abortController = new AbortController();
    controller.current = abortController;
    const request = ++requestId.current;
    const snapshot = JSON.parse(source);
    setBusy(true);
    setFailed(false);
    try {
      let details: UserInfoDetails = { userName: "", housingLocationType: "", evictionReason: "", chatHighlights: [] };
      const hasSources = snapshot.evictionNotice || snapshot.leaseAgreement || snapshot.conversation.some((message: { role: string }) => message.role === "user") || snapshot.additionalFiles.some((file: { markdown: string }) => file.markdown.trim());
      if (hasSources) {
        const client = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY, dangerouslyAllowBrowser: true });
        const response = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: condensedInfoPrompt },
            { role: "user", content: source },
          ],
          max_tokens: 2500,
        }, { signal: abortController.signal });
        if (response.choices[0]?.finish_reason !== "stop") throw new Error("Incomplete summary");
        details = parseUserInfoDetails(response.choices[0]?.message?.content || "");
      }
      if (request === requestId.current && latestSource.current === source && !abortController.signal.aborted) {
        dispatch(setUserInfoReport({ source, text: formatUserInfo(details, snapshot.location, snapshot.events) }));
      }
    } catch {
      if (request === requestId.current && !abortController.signal.aborted) setFailed(true);
    } finally {
      if (request === requestId.current && !abortController.signal.aborted) setBusy(false);
    }
  }, [source, dispatch]);

  useEffect(() => {
    if (reportRef.current?.source === source) {
      setBusy(false);
      setFailed(false);
      return;
    }
    setBusy(true);
    setFailed(false);
    // Coalesce related profile/document/deadline updates into one request.
    const timer = setTimeout(() => void generate(), 400);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
      requestId.current += 1;
    };
  }, [source, generate]);

  return <CondensedInfoContext.Provider value={{ currentReport, busy, failed, setFailed }}>{children}</CondensedInfoContext.Provider>;
}

export function useCondensedInfo() {
  const value = useContext(CondensedInfoContext);
  if (!value) throw new Error("CondensedInfoProvider is required");
  return value;
}
