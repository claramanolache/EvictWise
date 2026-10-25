import { buildCaseArchive, MissingCaseFileError } from "@/utils/caseArchive";
import { readOriginalFileBytes } from "@/utils/documentFiles";
import { downloadCaseArchive } from "@/utils/downloadCaseArchive";
import type { RootState } from "@/store";
import type { FileData } from "@/types";
import ThemedPressable from "@/components/ThemedPressable";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
import { englishReportEdits } from "@/utils/reportTranslation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUserInfoEdits } from "@/slice";
import { REPORT_FIELDS, readReportFields, ReportValues, ReportEdits } from "@/utils/condensedInfoEdits";
import { useCondensedInfo } from "@/context/CondensedInfoContext";
import { Modal, Platform, Pressable, Share, Text, TextInput, View, } from "react-native";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

const fileName = "case-summary.txt";

export default function CondensedUserInfo() {
  const { t, language, translateMessage } = useTranslation();
  const theme = getTheme(useColorScheme());
  const { currentReport, busy, failed } = useCondensedInfo();

  const dispatch = useDispatch();
  const { evictionNotice, leaseAgreement, additionalFiles } = useSelector((state: RootState) => state.app);
  const [downloadPrompt, setDownloadPrompt] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<{ missingFile?: string } | null>(null);
  const [draft, setDraft] = useState<ReportValues | null>(null);
  const [baseline, setBaseline] = useState<ReportValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [display, setDisplay] = useState<{ source: string; language: string; text: string; failed: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const translated = display?.source === currentReport && display.language === language ? display : null;
  const needsTranslation = Boolean(currentReport && language !== "en");

  useEffect(() => {
    let cancelled = false;
    if (!currentReport || language === "en") return;
    translateMessage(currentReport, "en", language).then(text => {
      if (!text.trim()) throw new Error("Empty translation");
      if (!cancelled) setDisplay({ source: currentReport, language, text, failed: false });
    }).catch(() => {
      if (!cancelled) setDisplay({ source: currentReport, language, text: currentReport, failed: true });
    });
    return () => { cancelled = true; };
  }, [currentReport, language, translateMessage, retry]);


  function startEditing() {
    if (!currentReport) return;
    const values = readReportFields(currentReport);
    setSaveFailed(false);
    setBaseline(values);
    setDraft(values);
  }

  async function saveEdits() {
    if (!draft || !baseline || saving) return;
    const changed: ReportEdits = {};
    for (const { key } of REPORT_FIELDS) {
      if (key !== "preferredLanguage" && draft[key] !== baseline[key]) changed[key] = draft[key];
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      dispatch(updateUserInfoEdits(await englishReportEdits(changed)));
      setDraft(null);
      setBaseline(null);
    } catch {
      setSaveFailed(true);
    } finally { setSaving(false); }
  }

  async function download(allCaseInfo = false) {
    if (!currentReport || downloading || busy) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      if (allCaseInfo) {
        const files = [evictionNotice, leaseAgreement, ...(additionalFiles ?? [])].filter((file): file is FileData => Boolean(file));
        const bytes = await buildCaseArchive(currentReport, files, readOriginalFileBytes);
        await downloadCaseArchive(bytes);
      } else if (Platform.OS === "web") {
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
      setDownloadPrompt(false);
    } catch (error) {
      setDownloadError(error instanceof MissingCaseFileError ? { missingFile: error.fileName } : {});
    } finally { setDownloading(false); }
  }

  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 12, backgroundColor: theme.backgroundSecondary }}>
      <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600" }}>{t("condensedUserInfo")}</Text>
      <Text style={{ color: theme.textSecondary }}>{fileName}</Text>
      <Text style={{ color: theme.textSecondary }}>{t("condensedInfoDescription")}</Text>
      {busy && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t("generatingUserInfo")}</Text>}
      {draft ? (
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.textSecondary }}>{t("condensedEditHelp")} {t("condensedEnglishEdits")}</Text>
          {REPORT_FIELDS.map(({ key, translation }) => (
            <View key={key} style={{ gap: 6 }}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>{t(translation)}</Text>
              <TextInput
                accessibilityLabel={t(translation)}
                editable={!saving && key !== "preferredLanguage"}
                value={draft[key]}
                onChangeText={(value) => setDraft((previous) => previous ? { ...previous, [key]: value } : previous)}
                multiline
                textAlignVertical="top"
                style={{ color: theme.text, backgroundColor: theme.backgroundInput, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, minHeight: key === "additionalInfo" || key === "deadlines" ? 100 : 48 }}
              />
            </View>
          ))}
          {saveFailed && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t("condensedSaveFailed")}</Text>}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <ThemedPressable accessibilityRole="button" disabled={saving} onPress={saveEdits} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent }}>
              <Text style={{ color: theme.textOnAccent }}>{t(saving ? "condensedSaving" : "saveCondensedEdits")}</Text>
            </ThemedPressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => { setDraft(null); setBaseline(null); }} style={{ padding: 12 }}>
              <Text style={{ color: theme.text }}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      ) : currentReport && (
        <>
          {needsTranslation && !translated ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t("translating")}</Text>
            : <Text selectable style={{ color: theme.text, lineHeight: 24 }}>{needsTranslation ? translated?.text : currentReport}</Text>}
          {needsTranslation && translated?.failed && <View style={{ gap: 8 }}>
            <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t("condensedTranslationFailed")}</Text>
            <Pressable accessibilityRole="button" onPress={() => { setDisplay(null); setRetry(value => value + 1); }} style={{ paddingVertical: 8 }}><Text style={{ color: theme.text }}>{t("retryTranslation")}</Text></Pressable>
          </View>}
          <ThemedPressable accessibilityRole="button" onPress={startEditing} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent }}>
            <Text style={{ color: theme.textOnAccent }}>{t("editCondensedInfo")}</Text>
          </ThemedPressable>
        </>
      )}
      {currentReport && !draft && <Pressable accessibilityRole="button" disabled={busy || downloading} onPress={() => { setDownloadError(null); setDownloadPrompt(true); }} style={{ padding: 12 }}>
        <Text style={{ color: theme.text }}>{t("downloadUserInfo")}</Text>
      </Pressable>}
      {downloadPrompt && <Modal visible transparent animationType="fade" onRequestClose={() => { if (!downloading) setDownloadPrompt(false); }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 480, padding: 24, gap: 16, borderRadius: 16, backgroundColor: theme.backgroundSecondary }}>
            <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600" }}>{t("caseDownloadTitle")}</Text>
            <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>{t("caseDownloadHelp")}</Text>
            <ThemedPressable accessibilityRole="button" disabled={downloading || busy} onPress={() => download(true)} style={{ padding: 12, borderRadius: 8 }}>
              <Text style={{ color: theme.textOnAccent }}>{t("caseDownloadAll")}</Text>
            </ThemedPressable>
            <ThemedPressable accessibilityRole="button" disabled={downloading || busy} onPress={() => download(false)} style={{ padding: 12, borderRadius: 8 }}>
              <Text style={{ color: theme.textOnAccent }}>{t("caseDownloadSummary")}</Text>
            </ThemedPressable>
            {downloading && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t("caseDownloadPreparing")}</Text>}
            {downloadError && <View style={{ gap: 6 }}>
              <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t(downloadError.missingFile ? "caseDownloadMissing" : "caseDownloadFailed")}</Text>
              {downloadError.missingFile && <Text style={{ color: theme.textWarning }}>{downloadError.missingFile}</Text>}
            </View>}
            <Pressable accessibilityRole="button" disabled={downloading} onPress={() => setDownloadPrompt(false)} style={{ padding: 12 }}>
              <Text style={{ color: theme.text }}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>}
      {failed && <Text accessibilityRole="alert" style={{ color: theme.textWarning, backgroundColor: theme.backgroundError, padding: 12, borderRadius: 8 }}>{t("userInfoFailed")}</Text>}
    </View>
  );
}
