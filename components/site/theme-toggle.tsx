"use client";

import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      /* storage can be unavailable in private modes */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
    >
      <Sun className="h-[1.05rem] w-[1.05rem] dark:hidden" aria-hidden />
      <Moon className="hidden h-[1.05rem] w-[1.05rem] dark:block" aria-hidden />
    </button>
  );
}
