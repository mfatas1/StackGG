import type { FilteredStats } from "@crewstats/stats";
import { ChampIcon } from "../kit/Avatar";
import { pct } from "@/lib/format";

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);

/**
 * Aggregate stats for whatever the match list is currently filtered to (a queue, a
 * champion, or both) — so picking a champion shows that champion's record, KDA, etc.
 * over the full filtered history, not just the games on screen.
 */
export function FilteredSummary({ stats, champName, label }: { stats: FilteredStats; champName?: string; label: string }) {
  if (stats.games === 0) {
    return (
      <div className="notch notch-sm mb-3 border border-line/60 bg-surface-2/40 px-3 py-2 text-sm text-ink-faint">
        No games for {champName ?? label.toLowerCase()} yet.
      </div>
    );
  }
  const wrTone = (stats.winrate ?? 0) >= 0.5 ? "text-win" : "text-loss";
  return (
    <div className="notch mb-3 flex flex-wrap items-center gap-x-6 gap-y-3 border border-line/60 bg-surface-2/40 px-4 py-3">
      {/* What we're looking at */}
      <div className="flex items-center gap-2.5">
        {champName && <ChampIcon name={champName} size={32} />}
        <div className="leading-tight">
          <div className="text-sm font-semibold">{champName ?? label}</div>
          {champName && <div className="text-2xs text-ink-faint">{label}</div>}
        </div>
      </div>

      {/* Winrate hero */}
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-3xl font-bold leading-none ${wrTone}`}>{pct(stats.winrate)}</span>
        <span className="font-mono text-2xs text-ink-faint tnum">
          {stats.wins}W {stats.losses}L · {stats.games}g
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
        <Stat label="KDA" value={stats.kda.toFixed(2)} sub={`${stats.avgKills.toFixed(1)} / ${stats.avgDeaths.toFixed(1)} / ${stats.avgAssists.toFixed(1)}`} />
        <Stat label="CS / min" value={stats.csPerMin.toFixed(1)} />
        <Stat label="Damage" value={short(stats.avgDamage)} />
        <Stat label="Vision" value={stats.avgVision.toFixed(0)} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="font-mono text-sm font-semibold tnum">{value}</div>
      {sub && <div className="font-mono text-[10px] text-ink-faint tnum">{sub}</div>}
    </div>
  );
}
