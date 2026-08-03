import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
/** O que o utilizador escolheu — "system" segue a preferência do dispositivo. */
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "taskora-theme";

type ThemeContextValue = {
  /** Tema efetivamente aplicado. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Preferência guardada (pode ser "system"). */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  preference: "light",
  setPreference: () => {},
});

function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Sempre inicia em modo claro; só muda se o utilizador tiver guardado a preferência.
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [system, setSystem] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") setPreferenceState(stored);
    setSystem(systemTheme());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme: Theme = preference === "system" ? system : preference;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme: setPreference, preference, setPreference }),
    [theme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
