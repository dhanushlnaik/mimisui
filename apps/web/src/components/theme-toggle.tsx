"use client";

import { useEffect, useState } from "react";
import { SecondaryButton } from "@/components/ui";

type DashboardTheme = "pink" | "green";
const STORAGE_KEY = "mimisui.theme";

function applyTheme(theme: DashboardTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<DashboardTheme>("pink");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const picked: DashboardTheme = stored === "green" ? "green" : "pink";
    setTheme(picked);
    applyTheme(picked);
  }, []);

  function toggleTheme() {
    const next: DashboardTheme = theme === "pink" ? "green" : "pink";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <SecondaryButton onClick={toggleTheme} className="h-8 px-3 py-1 text-xs">
      {theme === "pink" ? "Theme: Pink" : "Theme: Green"}
    </SecondaryButton>
  );
}
