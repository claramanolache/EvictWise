import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";

export default function PreferenceSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const theme = getTheme(useAppColorScheme());
  return <input type="range" aria-label={label} min={1} max={10} step={1} value={value}
    onChange={event => onChange(event.target.valueAsNumber)}
    style={{ width: "100%", height: 36, margin: 0, accentColor: theme.backgroundAccent, cursor: "pointer" }} />;
}
