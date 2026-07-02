"use client";
import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "@/components/kit/motion";
import type { ReactNode } from "react";

/**
 * The broadcast lower-third / stat slate: one huge counted-up number with a punchy label and a
 * one-line joke. The workhorse for scale scenes. Big, confident, theme-accented.
 */
export function BigStat({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={`font-display font-extrabold leading-[0.92] tracking-tight text-ink ${className}`} style={{ fontSize: "clamp(3.5rem, 13vw, 9rem)" }}>
      <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} duration={1100} />
    </span>
  );
}

export function StatSlate({
  kicker,
  value,
  decimals,
  prefix,
  suffix,
  label,
  joke,
  accent = "text-gold",
}: {
  kicker?: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: ReactNode;
  joke?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {kicker && <p className="text-sm uppercase tracking-[0.3em] text-ink-faint">{kicker}</p>}
      <BigStat value={value} decimals={decimals} prefix={prefix} suffix={suffix} className={accent} />
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-ink">{label}</p>
      {joke && <p className="max-w-xl text-pretty text-base text-ink-dim sm:text-lg">{joke}</p>}
    </div>
  );
}

/** Turns an abstract number into something relatable: stacked bars next to "≈ X work weeks". */
export function ComparisonScale({ items }: { items: { label: string; detail: string }[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
          className="notch-sm flex items-baseline gap-4 border border-line/70 bg-surface/60 px-4 py-3"
        >
          <span className="font-display text-3xl font-extrabold tabular-nums text-gold">{it.label}</span>
          <span className="text-left text-sm text-ink-dim">{it.detail}</span>
        </motion.div>
      ))}
    </div>
  );
}
