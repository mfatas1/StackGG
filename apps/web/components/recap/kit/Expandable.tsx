"use client";
import { useState, type ReactNode } from "react";

/**
 * A "show full breakdown" disclosure. Lets a scene stay clean by default but expand into the
 * dense data on demand — the depth that makes the stack feel deeply tracked. Pairs with the
 * scroll-snap proximity behaviour so the slide can grow taller when opened.
 */
export function Expandable({ label = "Show full breakdown", children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col items-center gap-4" data-no-nav>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-pill border border-line bg-surface/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-dim backdrop-blur transition-colors hover:text-ink"
      >
        {open ? "Hide breakdown ↑" : `${label} ↓`}
      </button>
      {open && <div className="w-full animate-fade-up">{children}</div>}
    </div>
  );
}
