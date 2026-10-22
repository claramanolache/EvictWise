import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type ThemeMode = "light" | "dark";
const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemMode = useColorScheme();
  const [preference, setPreference] = useState<ThemeMode | null>(null);
  useEffect(() => {
    try {
      const saved = globalThis.localStorage?.getItem("preferred-theme");
      if (saved === "light" || saved === "dark") setPreference(saved);
    } catch { /* Storage is optional. */ }
  }, []);
  const mode = preference ?? (systemMode === "dark" ? "dark" : "light");
  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    setPreference(next);
    try { globalThis.localStorage?.setItem("preferred-theme", next); } catch { /* Keep in memory. */ }
  }
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.style.colorScheme = mode;
  }, [mode]);
  return <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required");
  return context;
}
export function useAppColorScheme() {
  return useAppTheme().mode;
}
