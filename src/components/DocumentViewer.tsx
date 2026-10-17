import { useEffect, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Share, Text, View, useColorScheme } from "react-native";
import Markdown from "react-native-markdown-display";
import { FileData } from "@/types";
import { loadOriginalFile } from "@/utils/documentFiles";
import { getTheme } from "@/constants/theme";
import { themeToMarkdown } from "@/md";
import { useTranslation } from "@/Translation/TranslationContext";

export default function DocumentViewer({ file, onClose }: { file: FileData; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = getTheme(useColorScheme());
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!file.originalFileId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    if (file.originalFileId) {
      loadOriginalFile(file.originalFileId).then((value) => {
        objectUrl = value;
        if (cancelled) {
          if (Platform.OS === "web") URL.revokeObjectURL(value);
          return;
        }
        setUrl(value);
      }).catch(() => {
        if (!cancelled) setFailed(true);
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }
    return () => {
      cancelled = true;
      if (objectUrl && Platform.OS === "web") URL.revokeObjectURL(objectUrl);
    };
  }, [file.originalFileId]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 24, paddingTop: 48, backgroundColor: theme.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Text accessibilityRole="header" style={{ flex: 1, color: theme.text, fontSize: 18 }}>{file.name}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 12 }}>
            <Text style={{ color: theme.text }}>{t("closeDocument")}</Text>
          </Pressable>
        </View>
        {loading && <Text style={{ color: theme.text }}>{t("documentOpening")}</Text>}
        {!loading && (!url || failed) && <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>{t("documentOriginalUnavailable")}</Text>}
        {url && Platform.OS === "web" && <a href={url} download={file.name}>{t("downloadOriginalDocument")}</a>}
        {url && Platform.OS === "web" && file.mimeType === "application/pdf" ? (
          <>
            <iframe title={file.name} src={url} style={{ width: "100%", flex: 1, border: 0, marginTop: 12 }} />
          </>
        ) : url && file.mimeType?.startsWith("image/") ? (
          <Image source={{ uri: url }} resizeMode="contain" style={{ flex: 1 }} accessibilityLabel={file.name} />
        ) : (
          <>
            {url && Platform.OS !== "web" && <Pressable accessibilityRole="button" onPress={() => {
              void Share.share({ url, message: Platform.OS === "android" ? url : undefined }).catch(() => setFailed(true));
            }} style={{ paddingVertical: 12 }}><Text style={{ color: theme.text }}>{t("openOriginalDocument")}</Text></Pressable>}
            <ScrollView>{file.markdown ? <Markdown style={themeToMarkdown(theme)}>{file.markdown}</Markdown> : <Text style={{ color: theme.textSecondary, marginTop: 16 }}>{t("documentNoPreview")}</Text>}</ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}
