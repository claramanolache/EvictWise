import { useCondensedInfo } from "@/context/CondensedInfoContext";
import { Platform, Pressable, Share, Text, View, useColorScheme } from "react-native";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

const fileName = "condensed-user-info.txt";

export default function CondensedUserInfo() {
  const { t } = useTranslation();
  const theme = getTheme(useColorScheme());
  const { currentReport, busy, failed, setFailed, generate } = useCondensedInfo();

  async function download() {
    if (!currentReport) return;
    setFailed(false);
    try {
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([currentReport], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { File, Paths } = await import("expo-file-system");
        const file = new File(Paths.document, fileName);
        file.create({ overwrite: true });
        file.write(currentReport);
        await Share.share(Platform.OS === "ios"
          ? { title: fileName, url: file.uri }
          : { title: fileName, message: currentReport });
      }
    } catch {
      setFailed(true);
    }
  }

  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 12, backgroundColor: theme.backgroundSecondary }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}>{t("condensedUserInfo")}</Text>
      <Text style={{ color: theme.textSecondary }}>{fileName}</Text>
      <Text style={{ color: theme.textSecondary }}>{t("condensedInfoDescription")}</Text>
      {currentReport && <Text selectable style={{ color: theme.text, lineHeight: 24 }}>{currentReport}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void generate()} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent, opacity: busy ? 0.6 : 1 }}>
        <Text style={{ color: theme.text }}>{t(busy ? "generatingUserInfo" : "refreshUserInfo")}</Text>
      </Pressable>
      {currentReport && <Pressable accessibilityRole="button" onPress={download} style={{ padding: 12 }}>
        <Text style={{ color: theme.text }}>{t("downloadUserInfo")}</Text>
      </Pressable>}
      {failed && <Text accessibilityRole="alert" style={{ color: theme.text }}>{t("userInfoFailed")}</Text>}
    </View>
  );
}
