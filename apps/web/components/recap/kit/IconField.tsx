"use client";
import { motion, useReducedMotion } from "motion/react";

/**
 * A field of repeated glyphs that makes a count physical (a wall of skulls for deaths, bubbles
 * for pings). Art-directed: a density gradient, theme-tinted, capped so it stays a texture and
 * not a spreadsheet.
 */
export function IconField({
  count,
  glyph,
  cap = 280,
  tone = "loss",
  label,
}: {
  count: number;
  glyph: string;
  cap?: number;
  tone?: "loss" | "primary" | "gold";
  label?: string;
}) {
  const reduce = useReducedMotion();
  const shown = Math.min(count, cap);
  const color = tone === "loss" ? "var(--loss)" : tone === "gold" ? "var(--gold)" : "var(--primary)";
  const cells = Array.from({ length: shown });
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex max-w-3xl flex-wrap justify-center gap-[3px] leading-none">
        {cells.map((_, i) => {
          const a = 0.35 + (i / shown) * 0.65;
          return (
            <motion.span
              key={i}
              aria-hidden
              className="text-sm sm:text-base"
              style={{ color: `oklch(${color} / ${a.toFixed(2)})` }}
              initial={reduce ? false : { opacity: 0, scale: 0.4 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.004, 1.2) }}
            >
              {glyph}
            </motion.span>
          );
        })}
      </div>
      {count > cap && <p className="text-2xs uppercase tracking-wide text-ink-faint">…and {(count - cap).toLocaleString()} more</p>}
      {label && <p className="text-sm text-ink-dim">{label}</p>}
    </div>
  );
}
