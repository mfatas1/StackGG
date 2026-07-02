"use client";
import { useMemo } from "react";
import type { PlayerIdentity, CrewLineup, LeaderboardEntry } from "@crewstats/shared";
import { ProfileIcon, RankCrest } from "@/components/kit/Avatar";
import { Empty } from "@/components/kit/Frame";
import { averageRank, pct } from "@/lib/format";

/**
 * Team Performance (docs/competitive-casual-revamp.md, v2) — the differentiator op.gg can't
 * have: how the stack does *together*. Winrate by group size (5 / 4 / 3 / 2 from shared
 * lineups) against a solo-average baseline — the literal answer to "as a 5-stack vs duoq" —
 * plus the blended team rank and your strongest lineups. Client-side over already-loaded data.
 */
const SIZE_LABEL: Record<number, string> = { 5: "As a 5-stack", 4: "As a four", 3: "As a trio", 2: "As a duo" };

export function TeamPerformance({
  lineups,
  entries,
  members,
  minGames,
  crewSlug: _crewSlug,
}: {
  lineups: CrewLineup[];
  entries: LeaderboardEntry[];
  members: PlayerIdentity[];
  minGames: number;
  crewSlug: string;
}) {
  const byPuuid = useMemo(() => new Map(members.map((m) => [m.puuid, m])), [members]);
  const memberSet = useMemo(() => new Set(members.map((m) => m.puuid)), [members]);
  const threshold = Math.max(3, minGames);

  const { bySize, soloAvg, bestComps } = useMemo(() => {
    const sr = lineups.filter((l) => l.queueSlug === "ranked" || l.queueSlug === "flex");

    const sizeAgg = new Map<number, { games: number; wins: number }>();
    const setAgg = new Map<string, { puuids: string[]; games: number; wins: number }>();
    for (const l of sr) {
      const known = l.puuids.filter((p) => memberSet.has(p));
      const size = known.length;
      if (size < 2) continue;
      const s = sizeAgg.get(size) ?? { games: 0, wins: 0 };
      s.games++;
      if (l.win) s.wins++;
      sizeAgg.set(size, s);
      if (size >= 4) {
        const key = [...known].sort().join("|");
        const c = setAgg.get(key) ?? { puuids: [...known].sort(), games: 0, wins: 0 };
        c.games++;
        if (l.win) c.wins++;
        setAgg.set(key, c);
      }
    }

    const bySize = [5, 4, 3, 2]
      .map((size) => ({ size, ...(sizeAgg.get(size) ?? { games: 0, wins: 0 }) }))
      .filter((r) => r.games >= threshold)
      .map((r) => ({ ...r, winrate: r.wins / r.games }));

    const solos = entries.filter((e) => e.games >= 10 && e.winrate != null).map((e) => e.winrate!);
    const soloAvg = solos.length ? solos.reduce((a, b) => a + b, 0) / solos.length : null;

    const bestComps = [...setAgg.values()]
      .filter((c) => c.games >= threshold)
      .map((c) => ({ ...c, winrate: c.wins / c.games }))
      .sort((a, b) => b.puuids.length - a.puuids.length || b.winrate - a.winrate)
      .slice(0, 2);

    return { bySize, soloAvg, bestComps };
  }, [lineups, memberSet, entries, threshold]);

  const { rank, counted } = averageRank(entries.map((e) => e.rankSolo ?? e.rankFlex));
  const maxWr = Math.max(0.5, ...bySize.map((r) => r.winrate));

  if (!bySize.length && !rank)
    return <Empty>Play a few ranked/flex games together and your team performance shows here.</Empty>;

  return (
    <div className="space-y-4">
      {/* Blended rank header */}
      {rank && (
        <div className="flex items-center gap-3">
          <RankCrest rank={rank} size={36} withText={false} />
          <div>
            <div className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Team rank</div>
            <div className="font-display text-lg font-bold tracking-tight">
              {rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase()} {rank.rank}
              <span className="ml-1.5 text-2xs font-normal text-ink-dim">blended from {counted}</span>
            </div>
          </div>
        </div>
      )}

      {/* Winrate by group size */}
      {bySize.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Winrate by group size</div>
          {bySize.map((r) => (
            <div key={r.size} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-2xs text-ink-dim">{SIZE_LABEL[r.size]}</span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-surface-3/50">
                <div className={`absolute inset-y-0 left-0 ${r.winrate >= 0.5 ? "bg-win/60" : "bg-loss/55"}`} style={{ width: `${(r.winrate / maxWr) * 100}%` }} />
              </div>
              <span className={`w-20 shrink-0 text-right text-2xs tnum ${r.winrate >= 0.5 ? "text-win" : "text-loss"}`}>
                {pct(r.winrate)} <span className="text-ink-faint">· {r.games}g</span>
              </span>
            </div>
          ))}
          {soloAvg != null && (
            <div className="flex items-center gap-3 pt-0.5">
              <span className="w-24 shrink-0 text-2xs text-ink-faint">Solo (avg)</span>
              <div className="h-px flex-1 bg-line/50" />
              <span className="w-20 shrink-0 text-right text-2xs tnum text-ink-faint">{pct(soloAvg)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-2xs text-ink-dim">Not enough games together yet to break down by group size.</p>
      )}

      {/* Strongest lineups */}
      {bestComps.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Strongest lineups</div>
          {bestComps.map((c) => (
            <div key={c.puuids.join("|")} className="flex items-center justify-between gap-3">
              <div className="flex -space-x-2">
                {c.puuids.map((p) => {
                  const m = byPuuid.get(p)!;
                  return (
                    <span key={p} className="rounded-full ring-2 ring-bg" title={m.riotId}>
                      <ProfileIcon id={m.profileIcon} name={m.riotId} size={22} />
                    </span>
                  );
                })}
              </div>
              <span className={`text-2xs tnum ${c.winrate >= 0.5 ? "text-win" : "text-loss"}`}>
                {pct(c.winrate)} <span className="text-ink-faint">· {c.wins}W {c.games - c.wins}L</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
