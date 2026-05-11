import { useState, useEffect } from "react";

export type Theme = "default" | "business" | "lumina" | "original";

const STORAGE_KEY = "app-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "default";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "default";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  
  const html = document.documentElement;
  
  // Remove old themes
  html.removeAttribute("data-theme");
  html.classList.remove("theme-business", "dark");
    
  // Apply new theme
  if (theme === "business") {
    html.classList.add("theme-business");
  } else if (theme === "lumina") {
    html.setAttribute("data-theme", "lumina");
    // Check dark mode preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      html.classList.add("dark");
    }
  }
  // "default" and "original" themes: use CSS in index.css with :root variables
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("default");

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
    // Cycle: default -> business -> lumina -> default
    // We treat "original" as synonymous with "default" for cycling
    const themes: Theme[] = ["default", "business", "lumina"];
    const currentBaseTheme = theme === "original" ? "default" : theme;
    const currentIndex = themes.indexOf(currentBaseTheme as any);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }

  function toggleDarkMode() {
    if (theme === "lumina") {
      const html = document.documentElement;
      html.classList.toggle("dark");
    }
  }

  const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return { theme, setTheme, toggleTheme, toggleDarkMode, isDarkMode };
}