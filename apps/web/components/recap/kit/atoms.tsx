"use client";
import Image from "next/image";
import { champLoading, champIcon, profileIcon, champName, emote, type EmoteKey } from "@/lib/format";
import type { Tone } from "@/lib/recap/types";

/**
 * Theme-skinned tone system for the recap. Every accent resolves to a CSS-variable token, so a
 * scene reskins automatically across all six themes. shame = loss (red-ish), flex = gold
 * (trophy), neutral = the theme primary. Class strings are static literals (Tailwind-safe).
 */
export const TONE: Record<Tone, { text: string; bg: string; border: string; ring: string; soft: string; glow: string; label: string }> = {
  shame: {
    text: "text-loss",
    bg: "bg-loss",
    border: "border-loss/60",
    ring: "ring-loss/50",
    soft: "bg-loss/10",
    glow: "shadow-[0_0_60px_-18px_oklch(var(--loss)/0.8)]",
    label: "CRIME",
  },
  flex: {
    text: "text-gold",
    bg: "bg-gold",
    border: "border-gold/60",
    ring: "ring-gold/50",
    soft: "bg-gold/10",
    glow: "shadow-[0_0_60px_-18px_oklch(var(--gold)/0.8)]",
    label: "GLORY",
  },
  neutral: {
    text: "text-primary",
    bg: "bg-primary",
    border: "border-primary/50",
    ring: "ring-primary/40",
    soft: "bg-primary/10",
    glow: "shadow-[0_0_60px_-18px_oklch(var(--primary)/0.7)]",
    label: "NOTED",
  },
};

/** A real in-game summoner emote, for emotion/jokes. */
export function Emote({ name, size = 40, className = "", title }: { name: EmoteKey; size?: number; className?: string; title?: string }) {
  return (
    <Image
      src={emote(name)}
      alt={title ?? `${name} emote`}
      title={title}
      width={size}
      height={size}
      className={`inline-block select-none ${className}`}
      unoptimized
    />
  );
}

/** Small Cinzel act/eyebrow label — the broadcast lower-third tag. */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-display text-2xs font-bold uppercase tracking-[0.42em] text-gold/80 ${className}`}>
      {children}
    </span>
  );
}

/** Thin gold rule. */
export function GoldRule({ className = "" }: { className?: string }) {
  return <div className={`rule-gold ${className}`} />;
}

/** A champion loading-portrait inside the signature hextech notch frame. */
export function Portrait({
  champion,
  size = 200,
  tone = "neutral",
  className = "",
  priority = false,
}: {
  champion: string;
  size?: number;
  tone?: Tone;
  className?: string;
  priority?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`notch relative overflow-hidden border ${t.border} bg-surface-2 ${className}`}
      style={{ width: size, height: size * 1.18 }}
    >
      {champion ? (
        <Image
          src={champLoading(champion)}
          alt={champName(champion)}
          fill
          sizes={`${size}px`}
          className="object-cover object-top"
          priority={priority}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ink-faint">?</div>
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, oklch(var(--bg) / 0.85), transparent 55%)" }} />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 ${t.bg}`} />
    </div>
  );
}

/** A champion square icon ringed in a tone color — the "mugshot" / small adornment. */
export function ChampMug({ champion, size = 64, tone = "neutral", className = "" }: { champion: string; size?: number; tone?: Tone; className?: string }) {
  const t = TONE[tone];
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full ring-2 ${t.ring} ${className}`} style={{ width: size, height: size }}>
      {champion ? (
        <Image src={champIcon(champion)} alt={champName(champion)} fill sizes={`${size}px`} className="object-cover scale-110" unoptimized />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-surface-2 text-ink-faint">?</div>
      )}
    </div>
  );
}

/** A small summoner avatar (profile icon, fallback to champ square). */
export function MemberAvatar({ icon, champion, size = 36, className = "" }: { icon: number | null; champion?: string; size?: number; className?: string }) {
  const src = profileIcon(icon) ?? (champion ? champIcon(champion) : null);
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md ring-1 ring-line ${className}`} style={{ width: size, height: size }}>
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" unoptimized />
      ) : (
        <div className="absolute inset-0 bg-surface-2" />
      )}
    </div>
  );
}
