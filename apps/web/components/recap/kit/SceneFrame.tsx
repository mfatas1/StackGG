"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { champSplash } from "@/lib/format";
import { Eyebrow } from "./atoms";

type Variant = "splash" | "panel" | "plain";
type Align = "center" | "left";

/**
 * The shared scene shell. Three variants keep the rhythm varied (anti-slop rule #2): full-bleed
 * champion `splash`, solid `panel`, or `plain` atmosphere. Theme-awareness lives here — the
 * scrim is built from `--bg` so it darkens on dark themes and becomes a parchment wash on light
 * ones, and splash text always sits over a strong localized scrim so it clears contrast.
 */
export function SceneFrame({
  children,
  variant = "plain",
  splashChampion,
  act,
  align = "center",
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  splashChampion?: string | null;
  act?: string;
  align?: Align;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={`relative flex min-h-[100svh] w-full flex-col justify-center overflow-hidden px-6 py-16 sm:px-10 md:px-16 ${className}`}>
      {variant === "splash" && splashChampion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={reduce ? false : { opacity: 0, scale: 1.08 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={champSplash(splashChampion)}
            alt=""
            fill
            sizes="100vw"
            priority={false}
            unoptimized
            className="object-cover object-center opacity-90"
          />
          {/* Theme scrim: a wash toward --bg (dark→darkens, light→parchment) + a vignette. */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(var(--bg) / 0.55) 0%, oklch(var(--bg) / 0.30) 30%, oklch(var(--bg) / 0.75) 78%, oklch(var(--bg) / 0.96) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% 60%, transparent 40%, oklch(var(--bg) / 0.5) 100%)" }} />
          {/* Accent tint integrates the art into the theme (esp. light mode). */}
          <div className="absolute inset-0 mix-blend-soft-light opacity-40" style={{ background: "linear-gradient(120deg, oklch(var(--primary) / 0.5), transparent 60%)" }} />
        </motion.div>
      )}

      {variant === "panel" && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0" style={{ background: "radial-gradient(110% 90% at 50% 0%, oklch(var(--surface) / 0.9), oklch(var(--bg) / 0.95) 70%)" }} />
        </div>
      )}

      <div className={`relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 ${alignment}`}>
        {act && <Eyebrow>{act}</Eyebrow>}
        {children}
      </div>
    </div>
  );
}

/** A solid hextech panel for sitting dense content on art-heavy scenes. */
export function Panel({ children, className = "", tone = "" }: { children: ReactNode; className?: string; tone?: string }) {
  return (
    <div className={`notch border border-line bg-surface/90 backdrop-blur-sm shadow-pop ${tone} ${className}`}>{children}</div>
  );
}
