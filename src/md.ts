import { Platform } from "react-native";
import { Themes } from "./constants/theme";

export function themeToMarkdown(theme: Themes, size = 16) {
  return {
    body: {
      color: theme.text,
      fontSize: size,
      lineHeight: size * 1.6,
      flexShrink: 1,
      minWidth: 0,
      ...(Platform.OS === "web" ? { overflowWrap: "anywhere" as const } : {}),
    },

    paragraph: {
      color: theme.text,
      fontSize: size,
      lineHeight: size * 1.6,
      marginTop: 0,
      marginBottom: size * 0.65,
    },

    heading1: {
      color: theme.textHeading,
      fontSize: size * 2,
      lineHeight: size * 2.2,
    },

    heading2: {
      color: theme.textHeading,
      fontSize: size * 1.5,
      lineHeight: size * 1.7,
    },

    heading3: {
      color: theme.textHeading,
      fontSize: size,
      lineHeight: size * 1.6,
    },

    text: { flexShrink: 1 },

    list_item: {
      marginBottom: size * 0.3,
      fontSize: size,
      lineHeight: size * 1.6,
    },

    bullet_list: {
      marginTop: 0,
      marginBottom: size * 0.65,
    },

    ordered_list: {
      marginTop: 0,
      marginBottom: size * 0.65,
    },

    link: {
      color: theme.textSecondary,
    },

    strong: {
      fontWeight: "700",
    },

    code_inline: {
      color: theme.text,
      backgroundColor: theme.backgroundSelected,
      padding: size / 4,
      borderRadius: size / 4,
      lineHeight: size * 1.6,
    },

    code_block: {
      backgroundColor: theme.backgroundSelected,
      color: theme.text,
      padding: size * (10 / 16),
      borderRadius: size / 2,
      lineHeight: size * 1.6,
    },
  } as const;
}
