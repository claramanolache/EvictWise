import { useEffect, useState } from "react";
import organizations from "@/data/lawyers.json";
import { translateTexts } from "@/Translation/translate";

// Proper names, counties, addresses, and contact destinations stay unchanged.
const sourceTexts = [...new Set(organizations.flatMap(item => [
  item.description, ...item.services, ...item.representationLevels,
  ...item.caseStages, ...item.languages, item.language_assistance_notes,
]).filter((text): text is string => Boolean(text)))];

export function useLawyerTranslation(language: string) {
  const [result, setResult] = useState<{ language: string; values: Record<string, string>; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const active = result?.language === language ? result : null;

  useEffect(() => {
    let cancelled = false;
    if (language === "en") return;
    translateTexts({ texts: sourceTexts, sourceLanguage: "en", targetLanguage: language }).then(translations => {
      if (!Array.isArray(translations) || translations.length !== sourceTexts.length || translations.some(item => typeof item?.translatedText !== "string" || !item.translatedText.trim())) {
        throw new Error("Incomplete organization translation");
      }
      if (!cancelled) setResult({ language, failed: false, values: Object.fromEntries(sourceTexts.map((text, index) => [text, translations[index].translatedText])) });
    }).catch(() => {
      if (!cancelled) setResult({ language, failed: true, values: {} });
    });
    return () => { cancelled = true; };
  }, [language, attempt]);

  return {
    translateDetail: (text: string) => language === "en" ? text : active?.values[text] || text,
    loading: language !== "en" && !active,
    failed: language !== "en" && Boolean(active?.failed),
    retry: () => { setResult(null); setAttempt(value => value + 1); },
  };
}
