"use client";

import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggleTheme() {
    const nextTheme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("warmi-theme", nextTheme);
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label="Cambiar modo claro u oscuro"
      title="Cambiar tema"
    >
      <SunIcon className="theme-toggle__sun" />
      <MoonIcon className="theme-toggle__moon" />
    </button>
  );
}
