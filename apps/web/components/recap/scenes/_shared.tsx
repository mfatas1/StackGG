"use client";
import type { ReactNode } from "react";
import { Rise } from "../kit";

/** Big scene headline (Cinzel). */
export function Title({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-balance font-display font-extrabold leading-[1.02] tracking-tight text-ink ${className}`} style={{ fontSize: "clamp(2rem, 5.5vw, 4rem)" }}>
      {children}
    </h2>
  );
}

/** Framing copy under a headline — the voice. */
export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`max-w-2xl text-pretty text-base text-ink-dim sm:text-lg ${className}`}>{children}</p>;
}

/** Standard headline block with entrance. */
export function Framing({ title, lead, delay = 0 }: { title: ReactNode; lead?: ReactNode; delay?: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Rise delay={delay}>
        <Title className="text-center">{title}</Title>
      </Rise>
      {lead && (
        <Rise delay={delay + 0.1}>
          <Lead className="text-center">{lead}</Lead>
        </Rise>
      )}
    </div>
  );
}

/** "season" / "week" for window-aware copy. */
export function windowWord(window: "season" | "week"): string {
  return window === "week" ? "week" : "season";
}

/** A highlighted number/word inside copy. */
export function Hot({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "loss" | "win" | "primary" }) {
  const c = tone === "loss" ? "text-loss" : tone === "win" ? "text-win" : tone === "primary" ? "text-primary" : "text-gold";
  return <span className={`font-bold ${c}`}>{children}</span>;
}
