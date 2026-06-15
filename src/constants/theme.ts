import "@/global.css";

import { ColorSchemeName, Platform } from "react-native";

export const Colors = {
  light: {
    text: "#081008",
    textSecondary: "#606c64",
    background: "#ffffff",
    backgroundSecondary: "#f0f3f0",
    backgroundAccent: "#17d168",
    backgroundError: "#fa84aa",
    court: "#f20045",
    payment: "#f2d200",
    house: "#0071f2",
  },
  dark: {
    text: "#ffffff",
    textSecondary: "#b0bAb4",
    background: "#081008",
    backgroundSecondary: "#212522",
    backgroundAccent: "#08803c",
    backgroundError: "#6b0425",
    court: "#f20045",
    payment: "#f2d200",
    house: "#0071f2",
  },
} as const;

export type Themes = typeof Colors.light | typeof Colors.dark;
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
