import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/Language/LangOptions/en.json";
import es from "@/Language/LangOptions/es.json";

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        es: { translation: es }
    },
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: { escapeValue: false }
});

export default i18n;
async function getNativeTranslation(text: string, targetLanguageCode: string): Promise<string> {
    try {
        // Translate the given text to the requested native language
        const result = i18n.t(text, { lng: targetLanguageCode });
        return result;
    } catch (error) {
        console.error("Translation failed:", error);
        return text; // Fallback to original text
    }
}

(async () => {
    const spanishText = await getNativeTranslation("Hello, world", "es");
    console.log(spanishText); // Output: Hola, mundo
})();