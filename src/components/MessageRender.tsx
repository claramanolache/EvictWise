import { getTheme, Spacing } from "@/constants/theme";
import { Message } from "@/types";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import Markdown from "react-native-markdown-display";
import { ReactNode, useEffect, useRef } from "react";
import { Animated, Text, useColorScheme, View } from "react-native";
import { themeToMarkdown } from "@/md";

interface LoadingDotsProps {
  color: string;
}

function LoadingDots({ color }: LoadingDotsProps) {
  const animations = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = animations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(180),
        ]),
      ),
    );

    Animated.parallel(loops).start();
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [animations]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
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

function MessageRenderBase({ side, style, children }: MessageRenderBaseProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  return (
    <View
      style={[
        side === "left"
          ? { alignSelf: "flex-start", marginLeft: Spacing.two }
          : { alignSelf: "flex-end", marginRight: Spacing.two },
        {
          marginVertical: Spacing.two,
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.two,
          borderRadius: 12,
          maxWidth: "85%",
        },
        style === "user"
          ? { backgroundColor: theme.backgroundAccent }
          : style === "assistant"
            ? { backgroundColor: theme.backgroundSecondary }
            : style === "error"
              ? { backgroundColor: theme.backgroundError }
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

export default function MessageRender({ msg }: MessageRenderProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  if (msg.type === "error")
    return (
      <MessageRenderBase side="left" style="error">
        <Text style={[{ color: theme.text }]}>{msg.error}</Text>
      </MessageRenderBase>
    );
  if (msg.type === "chat")
    return (
      <MessageRenderBase
        side={msg.role === "assistant" ? "left" : "right"}
        style={msg.role}
      >
        <Markdown style={themeToMarkdown(theme)}>{msg.content}</Markdown>
        {msg.role === "assistant" && (
          <View
            style={[
              {
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                marginTop: 16,
                gap: 8,
              },
            ]}
          >
            <FontAwesomeFreeSolid
              name="info-circle"
              size={10}
              color={theme.textSecondary}
              style={[{ marginTop: 1 }]}
            />
            <Text style={[{ color: theme.textSecondary, fontSize: 10 }]}>
              I am not a professional and can make mistakes! Please check in
              with a licensed professional.
            </Text>
          </View>
        )}
      </MessageRenderBase>
    );
  if (msg.type === "loading")
    return (
      <MessageRenderBase side="left" style="assistant">
        <LoadingDots color={theme.textSecondary} />
      </MessageRenderBase>
    );
}
