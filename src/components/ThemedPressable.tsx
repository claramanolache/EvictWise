import { useState } from "react";
import { Pressable, PressableProps } from "react-native";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";

export default function ThemedPressable({ style, onHoverIn, onHoverOut, variant = "primary", ...props }: PressableProps & { variant?: "primary" | "secondary" }) {
  const theme = getTheme(useAppColorScheme());
  const [hovered, setHovered] = useState(false);
  return <Pressable
    {...props}
    onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
    style={(state) => [
      typeof style === "function" ? style(state) : style,
      { backgroundColor: !props.disabled && (hovered || state.pressed)
        ? theme.backgroundHover
        : variant === "secondary" ? theme.backgroundSelected : theme.backgroundAccent },
    ]}
  />;
}
