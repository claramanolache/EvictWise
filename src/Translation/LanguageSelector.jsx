import {
  useTranslation,
} from ".//TranslationContext";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ro", name: "Română" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh-CN", name: "简体中文" },
];

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