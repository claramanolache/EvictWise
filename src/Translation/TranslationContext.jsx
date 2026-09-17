import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  translateText as requestTextTranslation,
  translateTexts,
} from "./translate";

/**
 * @typedef {Object} TranslationValue
 * @property {string} language
 * @property {(language: string) => void} setLanguage
 * @property {(key: string) => string} t
 * @property {(text: string, sourceLanguage?: string) => Promise<string>} translateMessage
 * @property {boolean} interfaceLoading
 */
const TranslationContext = createContext(
  /** @type {TranslationValue | null} */ (null),
);

// Storage is optional on native devices, during SSR, and in private browsers.
function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Keep the language usable in memory when persistence is unavailable.
  }
}

const ORIGINAL_LANGUAGE = "en";

const ENGLISH_INTERFACE = {
  title: "Messages",
  language: "Language",
  conversation: "Conversation",
  messagePlaceholder: "Write a message",
  send: "Send",
  translate: "Translate",
  showOriginal: "Show original",
  translating: "Translating...",
  translationFailed: "Translation failed.",
};

export function TranslationProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return (
      readStorage("preferred-language") ||
      ORIGINAL_LANGUAGE
    );
  });

  const [interfaceText, setInterfaceText] = useState(
    ENGLISH_INTERFACE
  );

  const [interfaceLoading, setInterfaceLoading] =
    useState(false);

  const setLanguage = useCallback((nextLanguage) => {
    setLanguageState(nextLanguage);
    writeStorage(
      "preferred-language",
      nextLanguage
    );
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
    setInterfaceLoading(false);

    if (language === ORIGINAL_LANGUAGE) {
      setInterfaceText(ENGLISH_INTERFACE);
      return;
    }

    const cacheKey = `interface-${language}`;
    const cachedTranslation =
      readStorage(cacheKey);

    if (cachedTranslation) {
      try {
        setInterfaceText(
          JSON.parse(cachedTranslation)
        );
        return;
      } catch {
        // Ignore invalid cached data and request a fresh translation.
      }
    }

    let cancelled = false;

    async function translateInterface() {
      setInterfaceLoading(true);

      try {
        const entries = Object.entries(
          ENGLISH_INTERFACE
        );

        const translations = await translateTexts({
          texts: entries.map(([, value]) => value),
          targetLanguage: language,
          sourceLanguage: ORIGINAL_LANGUAGE,
        });

        const translatedInterface =
          Object.fromEntries(
            entries.map(([key], index) => [
              key,
              translations[index]?.translatedText ||
              ENGLISH_INTERFACE[key],
            ])
          );

        if (!cancelled) {
          setInterfaceText(translatedInterface);

          writeStorage(
            cacheKey,
            JSON.stringify(translatedInterface)
          );
        }
      } catch (error) {
        console.error(
          "Interface Translation failed:",
          error
        );

        if (!cancelled) {
          setInterfaceText(ENGLISH_INTERFACE);
        }
      } finally {
        if (!cancelled) {
          setInterfaceLoading(false);
        }
      }
    }

    translateInterface();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const t = useCallback(
    (key) => {
      return (
        interfaceText[key] ||
        ENGLISH_INTERFACE[key] ||
        key
      );
    },
    [interfaceText]
  );

  const translateMessage = useCallback(
    async (text, sourceLanguage = "auto") => {
      if (
        sourceLanguage !== "auto" &&
        sourceLanguage === language
      ) {
        return text;
      }

      return requestTextTranslation({
        text,
        targetLanguage: language,
        sourceLanguage,
      });
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      translateMessage,
      interfaceLoading,
    }),
    [
      language,
      setLanguage,
      t,
      translateMessage,
      interfaceLoading,
    ]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(
    TranslationContext
  );

  if (!context) {
    throw new Error(
      "useTranslation must be used inside TranslationProvider."
    );
  }

  return context;
}