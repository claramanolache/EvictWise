import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./LangOptions/en.json" with {type: 'json'};
import hi from "./LangOptions/hi.json" with {type: 'json'};
import ro from "./LangOptions/ro.json" with {type: 'json'};
import zh from "./LangOptions/zh.json" with {type: 'json'};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    hi: { translation: hi },
    ro: { translation: ro },
    zh: { translation: zh }
  },
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;

export async function getNativeTranslation(text, targetLanguageCode) {
  try {
    // Translate the given text to the requested native language
    const result = i18n.t(text, { lng: targetLanguageCode });
    return result;
  } catch (error) {
    console.error("Translation failed:", error);
    return text; // Fallback to original text
  }
}

