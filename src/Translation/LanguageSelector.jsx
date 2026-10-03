import {
  useTranslation,
} from ".//TranslationContext";

import { LANGUAGES } from "./languages";

export default function LanguageSelector() {
  const {
    language,
    setLanguage,
    t,
    interfaceLoading,
  } = useTranslation();

  return (
    <label>
      {t("language")}{" "}
      <select
        value={language}
        disabled={interfaceLoading}
        onChange={(event) =>
          setLanguage(event.target.value)
        }
      >
        {LANGUAGES.map((item) => (
          <option
            key={item.code}
            value={item.code}
          >
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}