const API_URL =
  process.env.EXPO_PUBLIC_TRANSLATION_API_URL ||
  "http://localhost:3001";

export async function translateTexts({
                                       texts,
                                       targetLanguage,
                                       sourceLanguage = "auto",
                                     }) {
  const normalizedTexts = Array.isArray(texts)
    ? texts
    : [texts];

  const response = await fetch(
    `${API_URL}/api/translate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts: normalizedTexts,
        targetLanguage,
        sourceLanguage,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Translation request failed."
    );
  }

  return data.translations;
}

export async function translateText({
                                      text,
                                      targetLanguage,
                                      sourceLanguage = "auto",
                                    }) {
  if (!text?.trim()) {
    return "";
  }

  const translations = await translateTexts({
    texts: [text],
    targetLanguage,
    sourceLanguage,
  });

  return translations[0]?.translatedText || text;
}