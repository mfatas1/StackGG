"use client";
import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { THEMES } from "./themes";
import { useTheme, setTheme } from "./themeStore";

/** Floating palette picker — flip themes live (persists to localStorage). */
export function ThemeSwitcher() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="notch absolute bottom-12 right-0 w-44 border border-line bg-bg/90 p-1.5 shadow-[0_12px_32px_oklch(0_0_0/0.5)] backdrop-blur-md">
          <p className="px-2 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Palette</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex w-full items-center gap-2.5 px-2 py-1.5 text-sm transition-colors ${theme === t.id ? "text-ink" : "text-ink-dim hover:text-ink"}`}
            >
              <span className="h-4 w-4 rounded-full ring-1 ring-line" style={{ background: t.swatch }} />
              <span className="flex-1 text-left">{t.label}</span>
              {t.light && <span className="text-[10px] text-ink-faint">light</span>}
              {theme === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change colour palette"
        className="notch grid h-10 w-10 place-items-center border border-line bg-bg/80 text-ink-dim shadow-[0_8px_24px_oklch(0_0_0/0.4)] backdrop-blur-md transition-colors hover:border-primary/60 hover:text-ink"
      >
        <Palette className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
