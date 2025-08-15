"use client";

import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeSwitcher.module.css";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light" as const, icon: "☀️", label: "Light" },
    { value: "dark" as const, icon: "🌙", label: "Dark" },
    { value: "system" as const, icon: "💻", label: "System" },
  ];

  return (
    <div className={styles.themeSwitcher}>
      {themeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          className={`${styles.option} ${theme === option.value ? styles.active : ""}`}
          title={option.label}
          aria-label={`Switch to ${option.label.toLowerCase()} theme`}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
