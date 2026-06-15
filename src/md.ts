import { Themes } from "./constants/theme";

export function themeToMarkdown(theme: Themes, size = 16) {
  return {
    body: {
      color: theme.text,
      fontSize: size,
      lineHeight: size * 1.2,
    },

    paragraph: {
      color: theme.text,
      fontSize: size,
      lineHeight: size * 1.2,
      marginTop: 0,
      marginBottom: 0,
    },

    heading1: {
      color: theme.text,
      fontSize: size * 2,
      lineHeight: size * 2.2,
    },

    heading2: {
      color: theme.text,
      fontSize: size * 1.5,
      lineHeight: size * 1.7,
    },

    heading3: {
      color: theme.text,
      fontSize: size,
      lineHeight: size * 1.2,
    },

    list_item: {
      fontSize: size,
      lineHeight: size * 1.2,
    },

    bullet_list: {
      marginTop: 0,
      marginBottom: 0,
    },

    ordered_list: {
      marginTop: 0,
      marginBottom: 0,
    },

    link: {
      color: theme.textSecondary,
    },

    strong: {
      fontWeight: "700",
    },

    code_inline: {
      color: theme.text,
      backgroundColor: theme.backgroundAccent,
      padding: size / 4,
      borderRadius: size / 4,
      lineHeight: size * 1.2,
    },

    code_block: {
      backgroundColor: theme.backgroundAccent,
      color: theme.text,
      padding: size * (10 / 16),
      borderRadius: size / 2,
      lineHeight: size * 1.2,
    },
  } as const;
}
