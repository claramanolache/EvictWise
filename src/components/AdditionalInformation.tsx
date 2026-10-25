import ThemedPressable from "@/components/ThemedPressable";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import * as DocumentPicker from "expo-document-picker";
import { RootState } from "@/store";
import { addAdditionalFile, removeAdditionalFile } from "@/slice";
import { FileData } from "@/types";
import { saveOriginalFile, removeOriginalFile } from "@/utils/documentFiles";
import { useTranslation } from "@/Translation/TranslationContext";

export default function AdditionalInformation({ onView, isEditing = false }: { onView: (file: FileData) => void; isEditing?: boolean }) {
  const { t } = useTranslation();
  const theme = getTheme(useAppColorScheme());
  const files = useSelector((state: RootState) => state.app.additionalFiles ?? []);
  const dispatch = useDispatch();
  const busy = useRef(false);
  const [removing, setRemoving] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const [pickerFailed, setPickerFailed] = useState(false);

  async function remove(file: FileData, index: number) {
    if (!isEditing || busy.current) return;
    busy.current = true;
    setRemoving(true);
    setRemoveFailed(false);
    try {
      if (file.originalFileId) await removeOriginalFile(file.originalFileId);
      dispatch(removeAdditionalFile(index));
    } catch { setRemoveFailed(true); }
    finally { busy.current = false; setRemoving(false); }
  }

  async function upload() {
    if (busy.current) return;
    busy.current = true;
    setUploading(true);
    setFailedNames([]);
    setPickerFailed(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/webp"], multiple: true, copyToCacheDirectory: true, base64: false,
      });
      if (result.canceled) return;
      // Store separately so a failed file doesn't discard successful uploads.
      for (const asset of result.assets) {
        try {
          const extension = asset.name.split(".").pop()?.toLowerCase() || "";
          const mimeType = asset.mimeType || asset.file?.type ||
            ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[extension] || "application/octet-stream";
          const originalFileId = await saveOriginalFile(asset, mimeType);
          dispatch(addAdditionalFile({ name: asset.name, markdown: "", mimeType, originalFileId }));
        } catch {
          setFailedNames((names) => [...names, asset.name]);
        }
      }
    } catch {
      setPickerFailed(true);
    } finally {
      busy.current = false;
      setUploading(false);
    }
  }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 16, gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: theme.textHeading }}>{t("additionalInformation")}</Text>
      <Text style={{ color: theme.textSecondary }}>{t("additionalInformationHelp")}</Text>
      <ThemedPressable accessibilityRole="button" disabled={uploading || removing} onPress={upload} style={{ alignSelf: "flex-start", padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent, opacity: uploading || removing ? 0.6 : 1 }}>
        <Text style={{ color: theme.textOnAccent }}>{t(uploading ? "documentUploading" : "uploadAdditionalFiles")}</Text>
      </ThemedPressable>
      {files.map((file, index) => (
        <View key={file.originalFileId || `file-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ flex: 1, color: theme.text }}>{file.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t("viewDocument")} ${file.name}`} onPress={() => onView(file)} style={{ padding: 10 }}>
            <Text style={{ color: theme.text, fontWeight: "600" }}>{t("viewDocument")}</Text>
          </Pressable>
          {isEditing && <Pressable accessibilityRole="button" accessibilityLabel={`${t("removeAdditionalFile")} ${file.name}`}
            disabled={uploading || removing} onPress={() => void remove(file, index)}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 8, opacity: uploading || removing ? 0.5 : 1 }}>
            <Text style={{ color: theme.textWarning, fontSize: 24 }}>×</Text>
          </Pressable>}
        </View>
      ))}
      {removeFailed && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t("removeAdditionalFileFailed")}</Text>}
      {(pickerFailed || failedNames.length > 0) && <Text accessibilityRole="alert" style={{ color: theme.textWarning, backgroundColor: theme.backgroundError, padding: 12, borderRadius: 8 }}>
        {t("additionalFilesFailed")}{failedNames.length > 0 ? `\n${failedNames.join("\n")}` : ""}
      </Text>}
    </View>
  );
}
