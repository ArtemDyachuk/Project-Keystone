"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeState, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      // Set the theme WITHOUT triggering the theme application effect
      // since the script already applied it
      setThemeState(savedTheme);
    } else {
      // No saved theme, default to system
      setThemeState("system");
    }
    
    // Get initial resolved theme from the current class on document
    // This should match what the ThemeScript set
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setResolvedTheme(currentTheme);
    
    // Also check if the script set a global theme variable
    if (typeof window !== 'undefined' && window.__THEME__) {
      setResolvedTheme(window.__THEME__);
    }
    
  }, []);

  // Custom setTheme function that handles theme changes
  const setTheme = (newTheme: Theme) => {
    if (!mounted) return;
    
    setThemeState(newTheme);
    
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove("light", "dark");
    
    let effectiveTheme: "light" | "dark";
    
    if (newTheme === "system") {
      // Use system preference
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      effectiveTheme = newTheme;
    }
    
    // Apply theme class
    root.classList.add(effectiveTheme);
    setResolvedTheme(effectiveTheme);
    
    // Save to localStorage
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    // Listen for system theme changes when using system theme
    if (!mounted) return;
    
    if (themeState === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleChange = (e: MediaQueryListEvent) => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        const newTheme = e.matches ? "dark" : "light";
        root.classList.add(newTheme);
        setResolvedTheme(newTheme);
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Return undefined for consistency
    return undefined;
  }, [themeState, mounted]);

  return (
    <ThemeContext.Provider value={{ theme: themeState, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
