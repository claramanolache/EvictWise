import {
  Text,
  View,
  StyleSheet,
  useColorScheme,
  Pressable,
  Animated,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getTheme, Fonts, Spacing } from "@/constants/theme";
import Layout from "@/components/Layout";
import { useState, useRef, useEffect, useMemo } from "react";
import OpenAI from "openai";
import { Message, serializeMessages } from "@/types";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { addMessage } from "@/slice";
import MessageRender from "@/components/MessageRender";
import { systemPrompt } from "@/assistantAI/prompt";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Index() {
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

  const messages = useSelector((state: RootState) => state.app.messages);
  const dispatch = useDispatch();

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const openai = useMemo(
    () =>
      new OpenAI({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      }),
    [],
  );

  const sendMessage = async () => {
    if (!inputText.trim()) return;
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
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <Layout>
      {/* {showNotification && (
        <Animated.View style={[styles.notification, { opacity: fadeAnim }]}>
          <Text style={styles.notificationText}>
            Documents successfully uploaded, processing
          </Text>
        </Animated.View>
      )} */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          {
            flex: 1,
            width: "100%",
          },
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          style={[
            {
              flex: 1,
              marginBottom: Spacing.three,
              borderRadius: 8,
              padding: Spacing.two,
            },
            { backgroundColor: theme.background },
          ]}
          contentContainerStyle={[
            {
              paddingBottom: Spacing.three,
            },
          ]}
        >
          {messages.length === 0 && (
            <Text
              style={[
                {
                  fontSize: 16,
                  textAlign: "center",
                  marginTop: Spacing.five,
                  fontFamily: Fonts?.sans,
                },
                { color: theme.textSecondary },
              ]}
            >
              Start a conversation...
            </Text>
          )}
          {messages.map((msg) => (
            <MessageRender key={msg.id} msg={msg} />
          ))}
          {loading && <MessageRender msg={{ type: "loading", id: "" }} />}
        </ScrollView>

        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: Spacing.two,
              paddingVertical: Spacing.two,
              borderTopWidth: 1,
              gap: Spacing.two,
            },
          ]}
        >
          <TextInput
            style={[
              {
                flex: 1,
                paddingHorizontal: Spacing.three,
                paddingVertical: Spacing.two,
                borderRadius: 12,
                fontSize: 14,
                maxHeight: 36,
                borderWidth: 1,
                fontFamily: Fonts?.sans,
                color: theme.text,
                backgroundColor: theme.backgroundSecondary,
              },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading}
            multiline
          />
          <TouchableOpacity
            style={[
              {
                paddingHorizontal: Spacing.four,
                paddingVertical: Spacing.two,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.backgroundAccent,
                opacity: loading ? 0.6 : 1,
              },
            ]}
            onPress={sendMessage}
            disabled={loading || !inputText.trim()}
          >
            <Text
              style={[
                {
                  fontSize: 14,
                  fontWeight: "600",
                  fontFamily: Fonts?.sans,
                  color: theme.text,
                },
              ]}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.three,
    fontFamily: Fonts?.sans,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "left",
    marginBottom: Spacing.four,
    lineHeight: 22,
    fontFamily: Fonts?.sans,
  },
  card: {
    width: "100%",
    borderRadius: 0,
    padding: Spacing.five,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
      },
    }),
  },
  cardText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts?.sans,
    lineHeight: 24,
  },
});
