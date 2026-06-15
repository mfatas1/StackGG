/**
 * Segmented winrate gauge — a row of angular Hextech ticks that fill by value.
 * Reads as a charge meter, not a generic progress bar. Tone "auto" colours by
 * win/loss threshold; the number always sits beside it (colour never alone).
 */
export function Gauge({
  value,
  segments = 10,
  tone = "auto",
}: {
  value: number | null;
  segments?: number;
  tone?: "auto" | "primary" | "gold";
}) {
  if (value == null) return <span className="text-ink-faint">—</span>;
  const filled = Math.round(value * segments);
  const color =
    tone === "primary" ? "bg-primary" : tone === "gold" ? "bg-gold" : value >= 0.5 ? "bg-win" : "bg-loss";
  return (
    <div className="flex h-2.5 w-full items-stretch gap-[2px]" role="presentation">
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={`flex-1 ${i < filled ? color : "bg-surface-3"}`}
          style={{
            clipPath: "polygon(2px 0,100% 0,100% calc(100% - 2px),calc(100% - 2px) 100%,0 100%,0 2px)",
            opacity: i < filled ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

/** A thin continuous bar, for inline contexts where the gauge is too busy. */
export function Bar({ value, tone = "primary" }: { value: number | null; tone?: "primary" | "win" | "gold" | "auto" }) {
  if (value == null) return <span className="text-ink-faint">—</span>;
  const w = Math.max(2, Math.round(value * 100));
  const color =
    tone === "auto" ? (value >= 0.5 ? "bg-win" : "bg-loss") : tone === "win" ? "bg-win" : tone === "gold" ? "bg-gold" : "bg-primary";
  return (
    <div className="h-1.5 w-full overflow-hidden bg-surface-3">
      <div className={`h-full ${color} transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`} style={{ width: `${w}%` }} />
    </div>
  );
}
