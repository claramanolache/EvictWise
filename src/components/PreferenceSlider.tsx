import Slider from "@expo/ui/community/slider";
import { View } from "react-native";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";

export default function PreferenceSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const theme = getTheme(useAppColorScheme());
  return <View accessible accessibilityRole="adjustable" accessibilityLabel={label}
    accessibilityValue={{ min: 1, max: 10, now: value }}
    accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
    onAccessibilityAction={event => {
      if (event.nativeEvent.actionName === "increment") onChange(Math.min(10, value + 1));
      if (event.nativeEvent.actionName === "decrement") onChange(Math.max(1, value - 1));
    }}>
    <Slider minimumValue={1} maximumValue={10} step={1} value={value} onValueChange={onChange}
      minimumTrackTintColor={theme.backgroundAccent} maximumTrackTintColor={theme.border} thumbTintColor={theme.backgroundAccent}
      style={{ height: 40, width: "100%" }} />
  </View>;
}
