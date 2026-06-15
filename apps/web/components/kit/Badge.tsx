import { signedPp } from "@/lib/format";

const TIER_TONE: Record<string, string> = {
  IRON: "text-ink-faint",
  BRONZE: "text-[oklch(0.65_0.08_50)]",
  SILVER: "text-ink-dim",
  GOLD: "text-gold",
  PLATINUM: "text-[oklch(0.78_0.10_190)]",
  EMERALD: "text-win",
  DIAMOND: "text-[oklch(0.75_0.12_250)]",
  MASTER: "text-[oklch(0.70_0.16_320)]",
  GRANDMASTER: "text-loss",
  CHALLENGER: "text-[oklch(0.82_0.12_200)]",
};
export function tierTone(tier?: string | null): string {
  return (tier && TIER_TONE[tier]) || "text-ink-dim";
}

/** Recent form — W/L glyphs, never colour alone (colour-blind safe). */
export function WLPills({ form }: { form: ("W" | "L")[] }) {
  if (!form.length) return <span className="text-ink-faint">—</span>;
  return (
    <span className="inline-flex gap-1" aria-label={`Recent form: ${form.join(", ")}`}>
      {form.map((r, i) => (
        <span
          key={i}
          className={`grid h-5 w-5 place-items-center font-mono text-2xs font-bold ${
            r === "W" ? "bg-win/15 text-win" : "bg-loss/15 text-loss"
          }`}
          style={{ clipPath: "polygon(3px 0,100% 0,100% calc(100% - 3px),calc(100% - 3px) 100%,0 100%,0 3px)" }}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function SampleSize({ games, label = "games" }: { games: number; label?: string }) {
  return (
    <span className="text-2xs font-medium text-ink-faint">
      {games} {label}
    </span>
  );
}

export function StaleChip() {
  return (
    <span
      className="bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold"
      title="Last-known data; this Riot ID is private, renamed, or transferred"
    >
      stale
    </span>
  );
}

/** Signed pp vs stack average — the sign carries meaning, colour reinforces it. */
export function WinLossDelta({ pp }: { pp: number | null }) {
  if (pp == null) return <span className="text-ink-faint">—</span>;
  const tone = pp >= 0.0005 ? "text-win" : pp <= -0.0005 ? "text-loss" : "text-ink-dim";
  return (
    <span className={`font-mono tnum ${tone}`} aria-label="vs stack average">
      {signedPp(pp)}
    </span>
  );
}
