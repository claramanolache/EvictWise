import { getTheme, Spacing } from "@/constants/theme";
import { themeToMarkdown } from "@/md";
import { useTranslation } from "@/Translation/TranslationContext";
import { LANGUAGES } from "@/Translation/languages";
import { Message } from "@/types";

import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import Markdown from "react-native-markdown-display";

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Text,
  useColorScheme,
  View,
} from "react-native";

interface LoadingDotsProps {
  color: string;
}

function LoadingDots({ color }: LoadingDotsProps) {
  const animations = useRef(
    [0, 1, 2].map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = animations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),

          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: Platform.OS !== "web",
          }),

          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: Platform.OS !== "web",
          }),

          Animated.delay(420 - index * 120),
        ]),
      ),
    );

    Animated.parallel(loops).start();

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [animations]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
      }}
    >
      {animations.map((anim, index) => (
        <Animated.Text
          key={index}
          style={{
            color,
            fontSize: 18,
            fontWeight: "800",
            marginHorizontal: 2,
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              },
            ],
          }}
        >
          •
        </Animated.Text>
      ))}
    </View>
  );
}

interface MessageRenderBaseProps {
  side: "left" | "right";
  style: "user" | "assistant" | "error" | "nothing";
  children?: ReactNode;
}

function MessageRenderBase({
                             side,
                             style,
                             children,
                           }: MessageRenderBaseProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  return (
    <View
      style={[
        side === "left"
          ? {
            alignSelf: "flex-start",
            marginLeft: Spacing.two,
          }
          : {
            alignSelf: "flex-end",
            marginRight: Spacing.two,
          },

        {
          marginVertical: Spacing.two,
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.two,
          borderRadius: 12,
          maxWidth: "85%",
        },

        style === "user"
          ? {
            backgroundColor:
            theme.backgroundAccent,
          }
          : style === "assistant"
            ? {
              backgroundColor:
              theme.backgroundSecondary,
            }
            : style === "error"
              ? {
                backgroundColor:
                theme.backgroundError,
              }
              : {},
      ]}
    >
      {children}
    </View>
  );
}

interface MessageRenderProps {
  msg: Message;
}

export default function MessageRender({
                                        msg,
                                      }: MessageRenderProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  /*
   * Translation functions from your
   * TranslationContext.
   */
  const {
    conversationTranslation,
    translateConversation,
    t,
    translateMessage,
  } = useTranslation();

  /*
   * Translation state for this individual
   * message.
   */
  const [translatedText, setTranslatedText] =
    useState("");

  const [showTranslation, setShowTranslation] =
    useState(false);

  const [translationLoading, setTranslationLoading] =
    useState(false);

  const [translationError, setTranslationError] =
    useState("");

  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const translationRequest = useRef(0);

  const content = msg.type === "chat" ? msg.content : null;

  useEffect(() => {
    const request = ++translationRequest.current;
    setLanguagePickerVisible(false);
    setTranslatedText("");
    setShowTranslation(false);
    setTranslationError("");
    setTranslationLoading(false);

    if (conversationTranslation && content?.trim()) {
      setTranslationLoading(true);
      translateMessage(content, "auto", conversationTranslation.language)
        .then((result) => {
          if (request !== translationRequest.current) return;
          setTranslatedText(result);
          setShowTranslation(true);
        })
        .catch(() => {
          if (request !== translationRequest.current) return;
          setTranslationError(t("translationFailed"));
        })
        .finally(() => {
          if (request === translationRequest.current) {
            setTranslationLoading(false);
          }
        });
    }

    return () => {
      translationRequest.current += 1;
    };
  }, [conversationTranslation, content, msg.id, translateMessage, t]);

  function handleTranslate(targetLanguage: string) {
    setLanguagePickerVisible(false);
    translateConversation(targetLanguage);
  }

  /*
   * ERROR MESSAGE
   */
  if (msg.type === "error") {
    return (
      <MessageRenderBase
        side="left"
        style="error"
      >
        <Text
          style={{
            color: theme.text,
          }}
        >
          {msg.error}
        </Text>
      </MessageRenderBase>
    );
  }

  /*
   * NORMAL CHAT MESSAGE
   */
  if (msg.type === "chat") {
    const displayedContent =
      showTranslation && translatedText
        ? translatedText
        : msg.content;

    return (
      <MessageRenderBase
        side={
          msg.role === "assistant"
            ? "left"
            : "right"
        }
        style={msg.role}
      >
        {/* Message content */}
        <Markdown
          style={themeToMarkdown(theme)}
        >
          {displayedContent}
        </Markdown>

        {/* Translation button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setLanguagePickerVisible(true)}
          style={{
            alignSelf: "flex-start",
            marginTop: 6,
            marginBottom: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <FontAwesomeFreeSolid
              name="language"
              size={12}
              color={theme.textSecondary}
            />

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {translationLoading
                ? t("translating")
                : t("translate")}
            </Text>
          </View>
        </Pressable>

        {showTranslation && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              translationRequest.current += 1;
              setTranslationLoading(false);
              setShowTranslation(false);
              setTranslationError("");
            }}
            style={{ alignSelf: "flex-start", paddingVertical: 8 }}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              {t("showOriginal")}
            </Text>
          </Pressable>
        )}

        <Modal
          visible={languagePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguagePickerVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              alignItems: "center",
              padding: Spacing.four,
            }}
          >
            <View
              accessibilityViewIsModal
              style={{
                backgroundColor: theme.background,
                borderRadius: 16,
                padding: Spacing.four,
                width: "100%",
                maxWidth: 400,
                maxHeight: "85%",
              }}
            >
              <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: "600", marginBottom: 16 }}>
                {t("selectLanguage")}
              </Text>
              <ScrollView>
                {LANGUAGES.map(({ code, name }) => (
                  <Pressable
                    key={code}
                    accessibilityRole="button"
                    onPress={() => void handleTranslate(code)}
                    style={{ paddingVertical: 12 }}
                  >
                    <Text style={{ color: theme.text, fontSize: 16 }}>{name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                onPress={() => setLanguagePickerVisible(false)}
                style={{ alignSelf: "flex-end", padding: 12, marginTop: 8 }}
              >
                <Text style={{ color: theme.textSecondary }}>{t("cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Translation error */}
        {translationError !== "" && (
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 10,
              marginTop: 4,
            }}
          >
            {translationError}
          </Text>
        )}

        {/* Assistant disclaimer */}
        {msg.role === "assistant" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              marginTop: 16,
              gap: 8,
            }}
          >
            <FontAwesomeFreeSolid
              name="info-circle"
              size={10}
              color={theme.textSecondary}
              style={{
                marginTop: 1,
              }}
            />

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 10,
                flexShrink: 1,
              }}
            >
              I am not a professional and can
              make mistakes! Please check in
              with a licensed professional.
            </Text>
          </View>
        )}
      </MessageRenderBase>
    );
  }

  /*
   * LOADING MESSAGE
   */
  if (msg.type === "loading") {
    return (
      <MessageRenderBase
        side="left"
        style="assistant"
      >
        <LoadingDots
          color={theme.textSecondary}
        />
      </MessageRenderBase>
    );
  }

  return null;
}