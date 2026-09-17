import { getTheme, Spacing } from "@/constants/theme";
import { themeToMarkdown } from "@/md";
import { useTranslation } from "@/Translation/TranslationContext";
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
    language,
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

  const translationRequest = useRef(0);

  /*
   * Whenever the user changes languages,
   * clear the old translation.
   *
   * Otherwise, for example, a Spanish
   * translation could remain visible after
   * switching the app to French.
   */
  useEffect(() => {
    translationRequest.current += 1;
    setTranslatedText("");
    setShowTranslation(false);
    setTranslationError("");
    setTranslationLoading(false);
    return () => {
      translationRequest.current += 1;
    };
  }, [
    language,
    msg.id,
    msg.type,
    msg.type === "chat" ? msg.content : "",
  ]);

  async function handleTranslate() {
    if (msg.type !== "chat" || translationLoading) {
      return;
    }

    /*
     * If we're currently showing the
     * translation, just switch back to
     * the original.
     */
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    /*
     * If we've already translated this
     * message, don't call Google again.
     */
    if (translatedText) {
      setShowTranslation(true);
      return;
    }

    const request = ++translationRequest.current;
    setTranslationLoading(true);
    setTranslationError("");

    try {
      /*
       * "auto" means Google determines
       * whether the original message is
       * English, Spanish, etc.
       */
      const result = await translateMessage(
        msg.content,
        "auto",
      );

      if (request !== translationRequest.current) return;
      setTranslatedText(result);
      setShowTranslation(true);
    } catch (error) {
      if (request !== translationRequest.current) return;
      console.error(
        "Message translation failed:",
        error,
      );

      setTranslationError(
        t("translationFailed"),
      );
    } finally {
      if (request === translationRequest.current) {
        setTranslationLoading(false);
      }
    }
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
          onPress={handleTranslate}
          disabled={translationLoading}
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
                : showTranslation
                  ? t("showOriginal")
                  : t("translate")}
            </Text>
          </View>
        </Pressable>

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