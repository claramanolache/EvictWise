import { useState } from "react";
import { Text, View } from "react-native";
import PreferenceSlider from "@/components/PreferenceSlider";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

const preferences = ["lawyerPriorityProximity", "lawyerPrioritySpecialization", "lawyerPriorityLanguage", "lawyerPriorityAffordability"] as const;
export default function LawyerPreferences() {
  const theme = getTheme(useAppColorScheme());
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(preferences.map(key => [key, 5])));
  return <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 16, padding: 20, gap: 20 }}>
    <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600" }}>{t("lawyerPriorities")}</Text>
    <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>{t("lawyerPrioritiesHelp")}</Text>
    {preferences.map(key => <View key={key} style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ flex: 1, color: theme.text, fontSize: 15 }}>{t(key)}</Text>
        <Text style={{ color: theme.backgroundAccent, fontSize: 15, fontWeight: "600" }}>{values[key]} / 10</Text>
      </View>
      <PreferenceSlider label={t(key)} value={values[key]} onChange={value => {
        if (Number.isFinite(value)) setValues(previous => ({ ...previous, [key]: Math.max(1, Math.min(10, Math.round(value))) }));
      }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>1</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>10</Text>
      </View>
    </View>)}
  </View>;
}
