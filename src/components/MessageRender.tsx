import { protectCitationLinks } from "@/utils/citationTranslation";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
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

  const assistant = style === "assistant";
  return <View style={{ flexDirection: "row", gap: 10, alignSelf: side === "right" ? "flex-end" : "flex-start", maxWidth: side === "right" ? "85%" : "92%", minWidth: 0 }}>
    {assistant && <View style={{ width: 28, height: 28, marginTop: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundSelected }}>
      <FontAwesomeFreeSolid name="shield-halved" size={14} color={theme.backgroundAccent} />
    </View>}
    <View style={{ flexShrink: 1, minWidth: 0, borderRadius: style === "error" ? 10 : 16, borderBottomRightRadius: style === "user" ? 5 : 16,
      padding: assistant ? 18 : style === "error" ? 12 : 14, borderWidth: assistant ? 1 : 0, borderColor: theme.border,
      backgroundColor: style === "user" ? theme.backgroundUserBubble : style === "error" ? theme.backgroundError : theme.backgroundAssistantBubble }}>
      {style === "error" && <FontAwesomeFreeSolid name="circle-info" size={14} color={theme.textWarning} style={{ marginBottom: 8 }} />}
      {children}
    </View>
  </View>;
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
  const [sourcesVisible, setSourcesVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [hoveredAction, setHoveredAction] = useState("");

  const content = msg.type === "chat" ? msg.content : null;

  useEffect(() => {
    const request = ++translationRequest.current;
    setLanguagePickerVisible(false);
    setCopyStatus("");
    setTranslatedText("");
    setShowTranslation(false);
    setTranslationError("");
    setTranslationLoading(false);

    if (conversationTranslation && content?.trim()) {
      setTranslationLoading(true);
      const citations = protectCitationLinks(content);
      translateMessage(citations.text, "auto", conversationTranslation.language)
        .then((result) => {
          if (request !== translationRequest.current) return;
          setTranslatedText(citations.restore(result));
          setShowTranslation(true);
        })
        .catch(() => {
          if (request !== translationRequest.current) return;
          setTranslationError("translationFailed");
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
  }, [conversationTranslation, content, msg.id, translateMessage]);

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
            color: theme.textWarning,
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
          onLinkPress={(url) => {
            if (url.startsWith("evictwise-source:") && msg.sources?.some(source => url === `evictwise-source:${source.id}`)) {
              setSourcesVisible(true);
              return false;
            }
            if (msg.role === "assistant" && msg.sources?.length) return msg.sources.some(source => source.url === url);
            return /^https?:\/\//i.test(url);
          }}
          style={themeToMarkdown(msg.role === "user" ? { ...theme, text: theme.textUserBubble, textHeading: theme.textUserBubble, textSecondary: theme.textUserBubble } : theme)}
        >
          {displayedContent}
        </Markdown>

        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16, marginTop: 6 }}>
          <Pressable accessibilityRole="button" onPress={() => setLanguagePickerVisible(true)}
            onHoverIn={() => setHoveredAction("translate")} onHoverOut={() => setHoveredAction("")}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}>
            <FontAwesomeFreeSolid name="language" size={13} color={msg.role === "user" ? theme.textUserBubble : hoveredAction === "translate" ? theme.backgroundAccent : theme.textSecondary} />
            <Text style={{ color: msg.role === "user" ? theme.textUserBubble : hoveredAction === "translate" ? theme.backgroundAccent : theme.textSecondary, fontSize: 12 }}>
              {translationLoading ? t("translating") : t("translate")}
            </Text>
          </Pressable>
          {msg.role === "assistant" && Platform.OS === "web" && <Pressable accessibilityRole="button"
            onHoverIn={() => setHoveredAction("copy")} onHoverOut={() => setHoveredAction("")}
            onPress={async () => {
              try {
                await navigator.clipboard.writeText(displayedContent);
                setCopyStatus("copiedResponse");
              } catch { setCopyStatus("copyFailed"); }
            }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}>
            <FontAwesomeFreeSolid name="copy" size={12} color={hoveredAction === "copy" ? theme.backgroundAccent : theme.textSecondary} />
            <Text style={{ color: hoveredAction === "copy" ? theme.backgroundAccent : theme.textSecondary, fontSize: 12 }}>{t(copyStatus === "copiedResponse" ? copyStatus : "copyResponse")}</Text>
          </Pressable>}
        </View>
        {copyStatus === "copyFailed" && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary, fontSize: 12 }}>{t(copyStatus)}</Text>}

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
            <Text style={{ color: msg.role === "user" ? theme.textUserBubble : theme.textSecondary, fontSize: 12 }}>
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
              <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600", marginBottom: 16 }}>
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
              fontSize: 12,
                lineHeight: 18,
              marginTop: 4,
            }}
          >
            {t(translationError)}
          </Text>
        )}

        {!!msg.sources?.length && <View style={{ marginTop: 12 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: sourcesVisible }} onPress={() => setSourcesVisible(!sourcesVisible)}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t("legalSources")} ({msg.sources.length}) {sourcesVisible ? "⌃" : "⌄"}</Text>
          </Pressable>
          {sourcesVisible && msg.sources.map(source => <View key={source.id} style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 8 }}>
            <Text selectable style={{ color: theme.textHeading, fontSize: 12 }}>[{source.id}] {source.title || source.file} · {source.page ? `${t("sourcePage")} ${source.page}` : `${t("sourcePassage")} ${source.part}`}</Text>
            {source.url && <Markdown style={themeToMarkdown(theme)} onLinkPress={url => url === source.url && url.startsWith("https://")}>
              {`[${source.url.replace(/[\[\]]/g, "")}](${"<" + source.url.replace(/</g, "%3C").replace(/>/g, "%3E") + ">"})`}
            </Markdown>}
            <Text selectable style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{source.excerpt}</Text>
          </View>)}
        </View>}

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
                fontSize: 12,
                lineHeight: 18,
                flexShrink: 1,
              }}
            >
              {t("assistantDisclaimer")}
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