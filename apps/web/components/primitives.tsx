import { pct } from "@/lib/format";

export function FormBadges({ form }: { form: ("W" | "L")[] }) {
  if (!form.length) return <span className="text-ink-faint">—</span>;
  return (
    <span className="inline-flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${
            r === "W" ? "bg-win/20 text-win" : "bg-loss/20 text-loss"
          }`}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function WinrateBar({ winrate, games }: { winrate: number | null; games: number }) {
  if (winrate == null) return <span className="text-ink-faint">—</span>;
  const w = Math.round(winrate * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-bg-hover">
        <div
          className={`h-full ${winrate >= 0.5 ? "bg-win" : "bg-loss"}`}
          style={{ width: `${w}%` }}
        />
      </div>
      <span className="stat-num text-sm">{pct(winrate)}</span>
      <SampleSize games={games} />
    </div>
  );
}

export function SampleSize({ games, label = "games" }: { games: number; label?: string }) {
  return (
    <span className="text-xs text-ink-faint">
      {games} {label}
    </span>
  );
}

export function Card({
  title,
  children,
  right,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold tracking-wide text-ink-dim uppercase">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">{children}</div>;
}

export function StaleBadge() {
  return (
    <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold" title="Last-known data; refresh pending">
      stale
    </span>
  );
}
