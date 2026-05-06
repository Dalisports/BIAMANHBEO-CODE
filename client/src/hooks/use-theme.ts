import { useState, useEffect } from "react";

export type Theme = "original" | "business";

const STORAGE_KEY = "app-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "original";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "original";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "business") {
    document.body.classList.add("theme-business");
  } else {
    document.body.classList.remove("theme-business");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("original");

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }

  function toggleTheme() {
    setTheme(theme === "original" ? "business" : "original");
  }

  return { theme, setTheme, toggleTheme };
}