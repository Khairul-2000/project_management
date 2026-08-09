import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DARK, LIGHT, makeCard } from "./constants";

const ThemeContext = createContext(null);

const STORAGE_KEY = "delivery-ops-theme";

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      /* ignore */
    }
    return "light";
  });

  const colors = mode === "dark" ? DARK : LIGHT;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    document.body.style.background = colors.bg;
    document.documentElement.style.colorScheme = mode;
  }, [mode, colors.bg]);

  const value = useMemo(
    () => ({
      mode,
      colors,
      card: makeCard(colors),
      isDark: mode === "dark",
      toggleTheme: () => setMode((m) => (m === "dark" ? "light" : "dark")),
      setMode,
    }),
    [mode, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: "light",
      colors: LIGHT,
      card: makeCard(LIGHT),
      isDark: false,
      toggleTheme: () => {},
      setMode: () => {},
    };
  }
  return ctx;
}
