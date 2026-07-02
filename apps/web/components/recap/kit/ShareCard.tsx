"use client";
import type { Recap } from "@/lib/recap/types";
import { TONE } from "./atoms";
import { ChampMug } from "./atoms";

/**
 * The designed, exportable summary card — the viral payload. Roster archetypes + headline
 * numbers + the group identity, watermarked with a recruit hook. The `next/og` route mirrors
 * this layout (resolved to hex) for the downloadable PNG.
 */
export function ShareCard({ recap }: { recap: Recap }) {
  const top = recap.roster.slice(0, 3);
  const hours = Math.round(recap.grind.hours);
  return (
    <div className="notch relative w-full max-w-md overflow-hidden border-2 border-gold/50 bg-surface shadow-glow-gold">
      <div className="absolute inset-0 opacity-[0.07]" style={{ background: "radial-gradient(circle at 30% 0%, oklch(var(--gold)), transparent 60%)" }} />
      <div className="relative flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-2xs font-bold uppercase tracking-[0.3em] text-gold/80">{recap.meta.windowLabel} Recap</span>
          <span className="text-2xs uppercase tracking-widest text-ink-faint">stackgg.app</span>
        </div>
        <h3 className="font-display text-3xl font-extrabold uppercase leading-none text-ink">{recap.meta.stackName}</h3>
        <div>
          <p className="font-display text-2xl font-extrabold text-gold">{recap.identity.name}</p>
          <p className="text-sm text-ink-dim">{recap.identity.blurb}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 border-y border-line/60 py-3 text-center">
          <Metric value={recap.grind.stackGames.toLocaleString()} label="games" />
          <Metric value={`${hours.toLocaleString()}h`} label="on the rift" />
          <Metric value={String(recap.pentakills?.total ?? 0)} label="pentakills" />
        </div>

        <div className="flex flex-col gap-2">
          {top.map((c) => (
            <div key={c.puuid} className="flex items-center gap-3">
              <ChampMug champion={c.champion} size={36} tone={c.tone} />
              <span className="flex-1 truncate text-sm text-ink-dim">{c.name}</span>
              <span className={`text-sm font-bold ${TONE[c.tone].text}`}>{c.title}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-2xs text-ink-faint">Make your group&apos;s recap → stackgg.app</p>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="tnum font-display text-xl font-extrabold text-ink">{value}</span>
      <span className="text-2xs uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}
