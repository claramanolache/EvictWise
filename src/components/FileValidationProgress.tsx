import { ActivityIndicator, Text, View } from "react-native";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

export default function FileValidationProgress() {
  const theme = getTheme(useAppColorScheme());
  const { t } = useTranslation();

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={{ alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}
    >
      <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={theme.backgroundAccent} style={{ transform: [{ scale: 1.5 }] }} />
      </View>
      <Text style={{ color: theme.textSecondary, fontSize: 16, textAlign: "center" }}>
        {t("validatingFileAuthenticity")}
      </Text>
    </View>
  );
}
