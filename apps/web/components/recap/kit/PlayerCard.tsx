"use client";
import Image from "next/image";
import { champLoading, champName, profileIcon } from "@/lib/format";
import type { RosterCard } from "@/lib/recap/types";
import { TONE } from "./atoms";
import { LockIn } from "./motion";

/**
 * The champion-select / loading-screen card: full-bleed champ portrait, the player's archetype
 * TITLE as their "role", the proof stat, and a tone ribbon (shame/flex/neutral). Designed to be
 * screenshot-worthy on its own — the backbone of the roster act.
 */
export function PlayerCard({ card, delay = 0, big = false }: { card: RosterCard; delay?: number; big?: boolean }) {
  const t = TONE[card.tone];
  const w = big ? 320 : 270;
  return (
    <LockIn delay={delay}>
      <figure
        className={`notch group relative overflow-hidden border-2 ${t.border} bg-surface-2 ${t.glow}`}
        style={{ width: w, height: w * 1.5 }}
      >
        {card.champion ? (
          <Image src={champLoading(card.champion)} alt={champName(card.champion)} fill sizes={`${w}px`} className="object-cover object-top transition-transform duration-700 group-hover:scale-105" unoptimized />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink-faint">no games</div>
        )}

        {/* scrim for legibility */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(var(--bg) / 0.15) 0%, transparent 28%, oklch(var(--bg) / 0.55) 60%, oklch(var(--bg) / 0.95) 100%)" }} />

        {/* tone ribbon — the "locked in" banner */}
        <figcaption className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2">
          <span className={`font-display text-2xs font-bold uppercase tracking-[0.25em] ${t.text}`}>{t.label}</span>
          <span className="text-2xs uppercase tracking-widest text-ink-faint">{card.rankNote}</span>
        </figcaption>

        {/* name + archetype plate */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-4 pb-4">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 overflow-hidden rounded ring-1 ring-line">
              {profileIcon(card.profileIcon) ? (
                <Image src={profileIcon(card.profileIcon)!} alt="" fill sizes="24px" className="object-cover" unoptimized />
              ) : (
                <div className="h-full w-full bg-surface-3" />
              )}
            </div>
            <span className="truncate text-xs font-semibold text-ink-dim">{card.name}</span>
          </div>
          <h3 className={`font-display text-3xl font-extrabold uppercase leading-none tracking-tight ${t.text}`}>{card.title}</h3>
          <p className="tnum text-sm font-semibold text-ink">{card.proof}</p>
          <p className="text-xs leading-snug text-ink-dim">{card.meaning}</p>
          {card.secondary && (
            <p className="mt-1 border-t border-line/50 pt-1.5 text-2xs text-ink-faint">
              also <span className={TONE[card.secondary.tone].text}>{card.secondary.title}</span> · {card.secondary.proof}
            </p>
          )}
        </div>
      </figure>
    </LockIn>
  );
}
