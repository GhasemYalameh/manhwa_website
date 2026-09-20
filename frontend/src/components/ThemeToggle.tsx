"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/icons";

type Theme = "light" | "dark";

interface ThemeToggleProps {
  variant?: "floating" | "icon" | "menu";
  className?: string; // فقط برای variant="menu"
}

export function ThemeToggle({ variant = "floating", className }: ThemeToggleProps) {
  // null = هنوز از DOM خونده نشده؛ برای جلوگیری از فلش آیکون اشتباه بعد از رفرش
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  const isDark = theme === "dark";

  if (variant === "icon") {
    if (theme === null) return <span className="h-9 w-9" />;
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="تغییر پوسته روشن/تیره"
        className="rounded-full p-2 text-text-secondary transition-colors hover:bg-accent-light hover:text-accent"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <button type="button" onClick={toggle} aria-label="تغییر پوسته روشن/تیره" className={className}>
        {isDark ? <SunIcon className="h-[17px] w-[17px]" /> : <MoonIcon className="h-[17px] w-[17px]" />}
        {isDark ? "پوسته‌ی روشن" : "پوسته‌ی تیره"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="تغییر پوسته روشن/تیره"
      className="fixed left-4 top-4 rounded-full border border-divider bg-surface px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-accent"
    >
      {isDark ? "روشن" : "تیره"}
    </button>
  );
}