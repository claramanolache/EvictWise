import { getTheme } from "@/constants/theme";
import { CalendarEvent, FileData, RawEvent } from "@/types";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import { Pressable, Text, useColorScheme, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useState, useMemo } from "react";
import { parsePdfToMarkdown } from "@/pdf";
import Markdown from "react-native-markdown-display";
import { themeToMarkdown } from "@/md";
import OpenAI from "openai";
import { extractEventsPrompt } from "@/assistantAI/prompt";
import { useDispatch } from "react-redux";
import { addEvent, clearEventsByDocument } from "@/slice";

export type UploadProps = {
  title: string;
  current: FileData | null;
  set: (file: FileData | null) => void;
  document: CalendarEvent["document"];
};

export default function Upload({ title, current, set, document }: UploadProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const openai = useMemo(
    () =>
      new OpenAI({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      }),
    [],
  );

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
              No file currently uploaded
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
              onPress={async () => {
                setLoading(true);
                try {
                  const result = await DocumentPicker.getDocumentAsync({
                    type: "application/pdf",
                    copyToCacheDirectory: true,
                  });
                  if (result.canceled) throw "Canceled";
                  const file = result.assets?.[0]?.file;
                  if (!file) throw "Missing file asset content";
                  const markdown = await parsePdfToMarkdown(file);
                  set({ name: file.name, markdown });

                  const response = await openai.chat.completions.create({
                    model: "gpt-4.1-mini",
                    messages: [
                      { role: "system", content: extractEventsPrompt },
                      { role: "user", content: markdown },
                    ],
                    temperature: 0,
                    max_tokens: 800,
                  });
                  const text = response.choices?.[0]?.message?.content || "";
                  const rawEvents = JSON.parse(text) as RawEvent[];
                  dispatch(clearEventsByDocument(document));
                  for (const rawEvent of rawEvents) {
                    const sourceDate = new Date(...rawEvent.date);
                    const date = new Date(
                      sourceDate.getTime() +
                        rawEvent.deltaDays * 24 * 60 * 60 * 1e3,
                    );
                    dispatch(
                      addEvent({
                        id: String(Math.random()),
                        document,
                        date: [
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate(),
                        ],
                        name: rawEvent.name,
                        type: rawEvent.type,
                      }),
                    );
                  }
                } finally {
                  setLoading(false);
                }
              }}
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
