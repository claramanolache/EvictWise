import { translateTexts } from "@/Translation/translate";
import { applyReportEdits, readReportFields, ReportEdits } from "./condensedInfoEdits";

// Translate values separately so the canonical English field labels remain parseable.
export async function englishReportEdits(edits: ReportEdits): Promise<ReportEdits> {
  const entries = Object.entries(edits);
  const nonempty = entries.filter(([key, value]) => key !== "userName" && key !== "preferredLanguage" && value?.trim());
  if (!nonempty.length) return edits;
  const results = await translateTexts({ texts: nonempty.map(([, value]) => value), sourceLanguage: "auto", targetLanguage: "en" });
  if (!Array.isArray(results) || results.length !== nonempty.length || results.some(item => typeof item?.translatedText !== "string" || !item.translatedText.trim())) {
    throw new Error("Incomplete English report translation");
  }
  return { ...edits, ...Object.fromEntries(nonempty.map(([key], index) => [key, results[index].translatedText])) };
}

export async function englishReport(text: string): Promise<string> {
  const values = readReportFields(text);
  return applyReportEdits(text, await englishReportEdits(values));
}
