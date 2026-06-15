"use client";
import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEMES } from "./themes";

const KEY = "stackgg:theme";
const ids = new Set(THEMES.map((t) => t.id));

function read(): string {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const fromDom = document.documentElement.dataset.theme;
  if (fromDom && ids.has(fromDom)) return fromDom;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && ids.has(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

const listeners = new Set<() => void>();

export function setTheme(id: string) {
  if (!ids.has(id)) return;
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (typeof document === "undefined" ? DEFAULT_THEME : document.documentElement.dataset.theme || DEFAULT_THEME),
    () => DEFAULT_THEME,
  );
}

/** Inline script (no-flash): applies the saved theme to <html> before first paint. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(KEY)});var ok=${JSON.stringify(
  [...ids],
)};if(t&&ok.indexOf(t)>=0){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
