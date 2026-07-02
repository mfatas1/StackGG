"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { champSplash } from "@/lib/format";

/**
 * A free-form scene canvas. Unlike SceneFrame (a centered column), Stage is a full-bleed relative
 * stage that scenes fill however they like — absolute anchors, asymmetry, overlap, negative space.
 * This is the anti-slideshow primitive: every scene composes its own story on it.
 */
export function Stage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`relative min-h-[100svh] w-full overflow-hidden ${className}`}>{children}</div>;
}

/**
 * Giant, faint background typography — the number/word the scene is about, blown up and bled off
 * an edge so it becomes atmosphere. Overlap content on top of it for depth.
 */
export function GhostText({
  children,
  className = "",
  size = "clamp(14rem, 42vw, 44rem)",
  opacity = 0.05,
}: {
  children: ReactNode;
  className?: string;
  size?: string;
  opacity?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute select-none font-display font-extrabold uppercase leading-[0.8] tracking-tighter text-ink ${className}`}
      style={{ fontSize: size, opacity }}
      initial={reduce ? false : { opacity: 0, scale: 1.06 }}
      whileInView={{ opacity, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.span>
  );
}

/**
 * A champion splash bled off one edge of the stage, faded into the background with a directional
 * mask so it reads as art, not a pasted photo. `side` = which edge it anchors to.
 */
export function SplashEdge({
  champion,
  side = "right",
  className = "",
  widthPct = 62,
  tint = true,
}: {
  champion: string;
  side?: "right" | "left" | "full";
  className?: string;
  widthPct?: number;
  tint?: boolean;
}) {
  const reduce = useReducedMotion();
  if (!champion) return null;
  const anchor =
    side === "full"
      ? "inset-0"
      : side === "right"
        ? "right-0 top-0 bottom-0"
        : "left-0 top-0 bottom-0";
  const fade =
    side === "right"
      ? "linear-gradient(90deg, oklch(var(--bg)) 0%, oklch(var(--bg) / 0.7) 22%, transparent 65%)"
      : side === "left"
        ? "linear-gradient(270deg, oklch(var(--bg)) 0%, oklch(var(--bg) / 0.7) 22%, transparent 65%)"
        : "linear-gradient(180deg, oklch(var(--bg) / 0.35) 0%, oklch(var(--bg) / 0.2) 30%, oklch(var(--bg) / 0.8) 82%, oklch(var(--bg)) 100%)";
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute ${anchor} ${className}`}
      style={side === "full" ? undefined : { width: `${widthPct}%` }}
      initial={reduce ? false : { opacity: 0, scale: 1.05 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <Image src={champSplash(champion)} alt="" fill sizes="100vw" unoptimized className="object-cover object-center" />
      <div className="absolute inset-0" style={{ background: fade }} />
      {/* vertical fades so it melts top/bottom too */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(var(--bg) / 0.6), transparent 20%, transparent 75%, oklch(var(--bg) / 0.85))" }} />
      {tint && <div className="absolute inset-0 mix-blend-soft-light opacity-40" style={{ background: "linear-gradient(120deg, oklch(var(--primary) / 0.55), transparent 55%)" }} />}
    </motion.div>
  );
}

/** A rotated, letter-spaced vertical label — for spine text down an edge. */
export function VerticalLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-display text-2xs font-bold uppercase tracking-[0.4em] text-gold/70 [writing-mode:vertical-rl] ${className}`}>
      {children}
    </span>
  );
}
