import "@/global.css";

import { ColorSchemeName, Platform } from "react-native";

export const Colors = {
  light: {
    text: "#222B26",
    textHeading: "#222B26",
    textSecondary: "#66756B",
    background: "#F7F8F5",
    backgroundSecondary: "#FFFFFF",
    backgroundAccent: "#167A50",
    backgroundHover: "#126441",
    backgroundSelected: "#E1F0E6",
    backgroundSidebar: "#10271E",
    textSidebar: "#F1F5F1",
    textOnAccent: "#FFFFFF",
    border: "#E5EAE5",
    backgroundInput: "#FFFFFF",
    backgroundUserBubble: "#E1F0E6",
    textUserBubble: "#222B26",
    backgroundAssistantBubble: "#FFFFFF",
    backgroundError: "#FFF3DF",
    textWarning: "#765018",
    court: "#f20045",
    payment: "#f2d200",
    house: "#0071f2",
  },
  dark: {
    text: "#D3DDD5",
    textHeading: "#F1F5F1",
    textSecondary: "#9EADA3",
    background: "#0E1713",
    backgroundSecondary: "#19251E",
    backgroundAccent: "#46B980",
    backgroundHover: "#369C6A",
    backgroundSelected: "#253D30",
    backgroundSidebar: "#121F18",
    textSidebar: "#F1F5F1",
    textOnAccent: "#0E1713",
    border: "#34453A",
    backgroundInput: "#25352B",
    backgroundUserBubble: "#267A50",
    textUserBubble: "#FFFFFF",
    backgroundAssistantBubble: "#19251E",
    backgroundError: "#3D3020",
    textWarning: "#F3C982",
    court: "#f20045",
    payment: "#f2d200",
    house: "#0071f2",
  },
} as const;

export type Themes = { [Key in keyof typeof Colors.light]: string };
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const getTheme = (colorScheme: ColorSchemeName): Themes =>
  colorScheme === "dark" ? Colors.dark : Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: "System",
    serif: "Times New Roman",
    rounded: "System",
    mono: "Menlo",
  },
  default: {
    sans: "sans-serif",
    serif: "serif",
    rounded: "sans-serif",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', Times, serif",
    rounded:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
