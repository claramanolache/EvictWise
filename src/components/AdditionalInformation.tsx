import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import * as DocumentPicker from "expo-document-picker";
import { RootState } from "@/store";
import { addAdditionalFile } from "@/slice";
import { FileData } from "@/types";
import { saveOriginalFile } from "@/utils/documentFiles";
import { useTranslation } from "@/Translation/TranslationContext";

export default function AdditionalInformation({ onView }: { onView: (file: FileData) => void }) {
  const { t } = useTranslation();
  const files = useSelector((state: RootState) => state.app.additionalFiles ?? []);
  const dispatch = useDispatch();
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const [pickerFailed, setPickerFailed] = useState(false);

  async function upload() {
    if (busy.current) return;
    busy.current = true;
    setUploading(true);
    setFailedNames([]);
    setPickerFailed(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", multiple: true, copyToCacheDirectory: true, base64: false,
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
    <View style={{ borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 16, marginTop: 16, gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: "#333" }}>{t("additionalInformation")}</Text>
      <Text style={{ color: "#666" }}>{t("additionalInformationHelp")}</Text>
      <Pressable accessibilityRole="button" disabled={uploading} onPress={upload} style={{ alignSelf: "flex-start", padding: 12, borderRadius: 8, backgroundColor: "#007BFF", opacity: uploading ? 0.6 : 1 }}>
        <Text style={{ color: "white" }}>{t(uploading ? "documentUploading" : "uploadAdditionalFiles")}</Text>
      </Pressable>
      {files.map((file) => (
        <View key={file.originalFileId} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ flex: 1, color: "#333" }}>{file.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t("viewDocument")} ${file.name}`} onPress={() => onView(file)} style={{ padding: 10 }}>
            <Text style={{ color: "#0056b3", fontWeight: "600" }}>{t("viewDocument")}</Text>
          </Pressable>
        </View>
      ))}
      {(pickerFailed || failedNames.length > 0) && <Text accessibilityRole="alert" style={{ color: "#9c163b" }}>
        {t("additionalFilesFailed")}{failedNames.length > 0 ? `\n${failedNames.join("\n")}` : ""}
      </Text>}
    </View>
  );
}
