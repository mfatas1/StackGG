import { Empty } from "../kit/Frame";
import { pct } from "@/lib/format";

/** Where a member ranks within the crew, per stat (member page §5.4). */
export function Percentiles({ rows }: { rows: { stat: string; value: number; percentile: number }[] }) {
  if (!rows.length) return <Empty>Not enough games to rank against the stack yet.</Empty>;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {rows.map((p) => (
        <div key={p.stat}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-ink-dim">{p.stat}</span>
            <span className="font-mono tnum">
              {p.stat === "Win rate" ? pct(p.value) : p.value.toFixed(2)}
              <span className="ml-2 text-2xs text-ink-faint">{p.percentile}th pctl</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden bg-surface-3">
            <div className="h-full bg-primary transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${p.percentile}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
