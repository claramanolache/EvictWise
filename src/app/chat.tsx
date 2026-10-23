import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import ThemedPressable from "@/components/ThemedPressable";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
import { buildChatProfileContext } from "@/utils/chatProfileContext";
import { useTranslation } from "@/Translation/TranslationContext";
import {
  Text,
  View,
  Animated,
  ScrollView,
  TextInput,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getTheme, Fonts } from "@/constants/theme";
import Layout from "@/components/Layout";
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import OpenAI from "openai";
import { Message, serializeMessages } from "@/types";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { addMessage } from "@/slice";
import MessageRender from "@/components/MessageRender";
import { systemPrompt } from "@/constants/assistantAI/prompt";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Index() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const params = useLocalSearchParams();
  const router = useRouter();
  const [showNotification, setShowNotification] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Conditionally use native driver only on iOS and Android
  const shouldUseNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (params.uploadSuccess === "true") {
      setShowNotification(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: shouldUseNativeDriver,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: shouldUseNativeDriver,
        }).start(() => {
          setShowNotification(false);
          // Clear the param from the URL
          router.setParams({ uploadSuccess: "false" });
        });
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [params.uploadSuccess]);

  const profile = useSelector((state: RootState) => state.app);
  const { messages } = profile;
  const dispatch = useDispatch();

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const { width } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(44);
  const nearBottom = useRef(true);
  const submitting = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const resizeWebInput = () => {
    if (Platform.OS !== "web" || !inputRef.current) return;
    const element = inputRef.current as unknown as HTMLTextAreaElement;
    element.style.height = "0px";
    const height = Math.min(160, Math.max(44, element.scrollHeight));
    element.style.height = `${height}px`;
    setInputHeight(height);
  };
  useLayoutEffect(resizeWebInput, [inputText, width]);


  const openai = useMemo(
    () =>
      new OpenAI({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      }),
    [],
  );

  const sendMessage = async () => {
    if (!inputText.trim() || submitting.current) return;
    submitting.current = true;
    nearBottom.current = true;
    setInputHeight(44);
    setInputText("");

    const userMessage: Message = {
      type: "chat",
      id: Date.now().toString(),
      role: "user",
      content: inputText,
    };
    dispatch(addMessage(userMessage));

    setLoading(true);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: buildChatProfileContext(profile) },
          ...serializeMessages([...messages, userMessage]),
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantMessage: Message = {
        type: "chat",
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          response.choices[0]?.message?.content ||
          "No response received from AI",
      };
      dispatch(addMessage(assistantMessage));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get response";
      dispatch(
        addMessage({
          type: "error",
          id: (Date.now() + 1).toString(),
          error: errorMessage,
        }),
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const scrollToNewest = () => {
    if (nearBottom.current) scrollViewRef.current?.scrollToEnd({ animated: true });
  };
  const horizontalPadding = width < 768 ? 16 : 24;
  return <Layout>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, minHeight: 0 }}>
      <ScrollView ref={scrollViewRef} style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToNewest} scrollEventThrottle={100}
        onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
          nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 100;
        }}
        contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: 800, alignSelf: "center", paddingHorizontal: horizontalPadding, paddingVertical: 24, gap: 24 }}>
        {messages.length === 0 && <View style={{ flex: 1, justifyContent: "center", paddingVertical: 48, gap: 20 }}>
          <Text style={{ color: theme.backgroundAccent, fontSize: 12, fontWeight: "600", letterSpacing: 2 }}>{t("assistantLabel")}</Text>
          <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 28, lineHeight: 36, fontWeight: "600" }}>{t("welcomeHeading")}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 25 }}>{t("welcomeSubtitle")}</Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {["suggestNotice", "suggestRights", "suggestCourt"].map(key => <ThemedPressable variant="secondary" key={key} accessibilityRole="button" onPress={() => setInputText(t(key))}
              style={{ padding: 16, borderWidth: 1, borderColor: theme.border, borderRadius: 12 }}>
              <Text style={{ color: theme.text, fontSize: 15 }}>{t(key)}</Text>
            </ThemedPressable>)}
          </View>
        </View>}
        {messages.map(msg => <MessageRender key={msg.id} msg={msg} />)}
        {loading && <MessageRender msg={{ type: "loading", id: "loading" }} />}
      </ScrollView>
      <View style={{ width: "100%", maxWidth: 800, alignSelf: "center", paddingHorizontal: horizontalPadding, paddingTop: 12, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 8, gap: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundInput }}>
          <TextInput ref={inputRef} onLayout={resizeWebInput} accessibilityLabel={t("followUpPlaceholder")} placeholder={t("followUpPlaceholder")} placeholderTextColor={theme.textSecondary}
            value={inputText} onChangeText={setInputText} editable={!loading} multiline scrollEnabled={inputHeight >= 160}
            onContentSizeChange={event => { if (Platform.OS !== "web") setInputHeight(Math.min(160, Math.max(44, event.nativeEvent.contentSize.height))); }}
            onKeyPress={event => {
              const key = event.nativeEvent as unknown as { key: string; shiftKey?: boolean; isComposing?: boolean; keyCode?: number };
              if (Platform.OS === "web" && key.key === "Enter" && !key.shiftKey && !key.isComposing && key.keyCode !== 229) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            style={{ flex: 1, minWidth: 0, height: inputHeight, maxHeight: 160, paddingHorizontal: 8, paddingVertical: 10, color: theme.text, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, textAlignVertical: "top" }} />
          <ThemedPressable accessibilityRole="button" accessibilityLabel={t("send")} onPress={sendMessage} disabled={loading || !inputText.trim()}
            style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", opacity: loading || !inputText.trim() ? 0.45 : 1 }}>
            <FontAwesomeFreeSolid name="arrow-up" size={18} color={theme.textOnAccent} />
          </ThemedPressable>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 10 }}>{t("composerDisclaimer")}</Text>
      </View>
    </KeyboardAvoidingView>
  </Layout>;
}
