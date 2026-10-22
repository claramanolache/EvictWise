import ThemedPressable from "@/components/ThemedPressable";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { updateUserInfoEdits } from "@/slice";
import { REPORT_FIELDS, readReportFields, ReportValues, ReportEdits } from "@/utils/condensedInfoEdits";
import { useCondensedInfo } from "@/context/CondensedInfoContext";
import { Platform, Pressable, Share, Text, TextInput, View, } from "react-native";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

const fileName = "condensed-user-info.txt";

export default function CondensedUserInfo() {
  const { t } = useTranslation();
  const theme = getTheme(useColorScheme());
  const { currentReport, busy, failed, setFailed } = useCondensedInfo();

  const dispatch = useDispatch();
  const [draft, setDraft] = useState<ReportValues | null>(null);
  const [baseline, setBaseline] = useState<ReportValues | null>(null);

  function startEditing() {
    if (!currentReport) return;
    const values = readReportFields(currentReport);
    setBaseline(values);
    setDraft(values);
  }

  function saveEdits() {
    if (!draft || !baseline) return;
    const changed: ReportEdits = {};
    for (const { key } of REPORT_FIELDS) {
      if (draft[key] !== baseline[key]) changed[key] = draft[key];
    }
    dispatch(updateUserInfoEdits(changed));
    setDraft(null);
    setBaseline(null);
  }

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
      <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600" }}>{t("condensedUserInfo")}</Text>
      <Text style={{ color: theme.textSecondary }}>{fileName}</Text>
      <Text style={{ color: theme.textSecondary }}>{t("condensedInfoDescription")}</Text>
      {busy && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t("generatingUserInfo")}</Text>}
      {draft ? (
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.textSecondary }}>{t("condensedEditHelp")}</Text>
          {REPORT_FIELDS.map(({ key, translation }) => (
            <View key={key} style={{ gap: 6 }}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>{t(translation)}</Text>
              <TextInput
                accessibilityLabel={t(translation)}
                value={draft[key]}
                onChangeText={(value) => setDraft((previous) => previous ? { ...previous, [key]: value } : previous)}
                multiline
                textAlignVertical="top"
                style={{ color: theme.text, backgroundColor: theme.backgroundInput, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, minHeight: key === "additionalInfo" || key === "deadlines" ? 100 : 48 }}
              />
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <ThemedPressable accessibilityRole="button" onPress={saveEdits} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent }}>
              <Text style={{ color: theme.textOnAccent }}>{t("saveCondensedEdits")}</Text>
            </ThemedPressable>
            <Pressable accessibilityRole="button" onPress={() => { setDraft(null); setBaseline(null); }} style={{ padding: 12 }}>
              <Text style={{ color: theme.text }}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      ) : currentReport && (
        <>
          <Text selectable style={{ color: theme.text, lineHeight: 24 }}>{currentReport}</Text>
          <ThemedPressable accessibilityRole="button" onPress={startEditing} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent }}>
            <Text style={{ color: theme.textOnAccent }}>{t("editCondensedInfo")}</Text>
          </ThemedPressable>
        </>
      )}
      {currentReport && !draft && <Pressable accessibilityRole="button" onPress={download} style={{ padding: 12 }}>
        <Text style={{ color: theme.text }}>{t("downloadUserInfo")}</Text>
      </Pressable>}
      {failed && <Text accessibilityRole="alert" style={{ color: theme.textWarning, backgroundColor: theme.backgroundError, padding: 12, borderRadius: 8 }}>{t("userInfoFailed")}</Text>}
    </View>
  );
}
