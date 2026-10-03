import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useTranslation } from "@/Translation/TranslationContext";
import { getTheme } from "@/constants/theme";
import { CalendarEvent, FileData } from "@/types";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import { Pressable, Text, useColorScheme, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { themeToMarkdown } from "@/md";

export type UploadProps = {
  title: string;
  current: FileData | null;
  set: (file: FileData | null) => void;
  document: CalendarEvent["document"];
};

export default function Upload({ title, current, set, document }: UploadProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const { upload, loading, failed, errorKey } = useDocumentUpload();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        gap: 8,
        width: "100%",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 8,
          width: "100%",
        }}
      >
        <FontAwesomeFreeSolid name="file" size={18} color={theme.text} />
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
          {title}
        </Text>
      </View>
      {failed && <Text accessibilityRole="alert" style={{ color: theme.text }}>{t(errorKey)}</Text>}
      <View
        style={{
          position: "relative",
          flexDirection: !loading && current ? "row" : "column",
          alignItems: !loading && current ? "flex-start" : "center",
          justifyContent: !loading && current ? "flex-start" : "center",
          gap: 16,
          width: "100%",
          padding: !loading && current ? 16 : 0,
          aspectRatio: "1.5",
          borderWidth: 1,
          borderColor: theme.backgroundSecondary,
          borderRadius: 12,
        }}
      >
        {loading && (
          <>
            <Text style={{ color: theme.textSecondary }}>Loading Files...</Text>
            <Text style={{ color: theme.textSecondary }}>
              Do not navigate away!
            </Text>
          </>
        )}
        {!loading && !current && (
          <>
            <Text style={{ color: theme.textSecondary }}>
              {t("documentFormats")}
            </Text>
            <FontAwesomeFreeSolid
              name="upload"
              size={24}
              color={theme.textSecondary}
            />
            <Pressable
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
              onPress={() => void upload(document, set)}
            />
          </>
        )}
        {!loading && current && (
          <>
            <Text style={{ color: theme.textSecondary }}>{current.name}</Text>
            <View
              style={{
                position: "absolute",
                top: 48,
                bottom: 0,
                left: 16,
                right: 16,
                overflow: "hidden",
                padding: 8,
                backgroundColor: theme.backgroundSecondary,
              }}
            >
              <Markdown style={themeToMarkdown(theme, 4)}>
                {current.markdown}
              </Markdown>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
