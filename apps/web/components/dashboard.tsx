import Link from "next/link";
import type {
  CrewDashboard,
  LeaderboardEntry,
  DuoSynergy,
  HeadToHead,
  FlexRoleStat,
  ActivityItem,
} from "@crewstats/shared";
import { QUEUE_LABEL } from "@crewstats/shared";
import { ChampIcon, ProfileIcon } from "./Icons";
import { Card, FormBadges, SampleSize, Empty, StaleBadge } from "./primitives";
import {
  pct,
  signedPp,
  rankString,
  kdaString,
  timeAgo,
  gameDuration,
  placementSuffix,
} from "@/lib/format";

export function MetricCards({ d }: { d: CrewDashboard }) {
  const c = d.cards;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Games this week" value={String(c.gamesThisWeek)} sub={`${c.totalSharedGames} shared all-time`} />
      <Metric
        label="5-stack winrate"
        value={c.fiveStackWinrate != null ? pct(c.fiveStackWinrate) : "—"}
        sub={c.fiveStackGames ? `${c.fiveStackGames} full-stack games` : "no full-stack games yet"}
      />
      <Metric
        label="Best duo"
        value={c.bestDuo ? pct(c.bestDuo.winrate) : "—"}
        sub={c.bestDuo ? `${c.bestDuo.a.riotId} + ${c.bestDuo.b.riotId} · ${c.bestDuo.games}g` : "need 3+ shared games"}
      />
      <Metric
        label="Biggest climber"
        value={c.biggestClimber ? c.biggestClimber.identity.riotId : "—"}
        sub={c.biggestClimber ? `${c.biggestClimber.lpDelta > 0 ? "+" : ""}${c.biggestClimber.lpDelta} net W–L this week` : "no ranked games this week"}
      />
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 truncate text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-ink-dim">{sub}</div>
    </div>
  );
}

export function Leaderboard({ entries, slug, crewSlug }: { entries: LeaderboardEntry[]; slug: string; crewSlug: string }) {
  if (!entries.length) return <Empty>No games ingested yet for this mode.</Empty>;
  const isArena = slug === "arena";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Player</th>
            <th className="py-2 pr-2">Rank</th>
            <th className="py-2 pr-2">{isArena ? "Avg place" : "Winrate"}</th>
            <th className="py-2 pr-2">Form</th>
            <th className="py-2 pr-2">7d</th>
            <th className="py-2 pr-2">vs crew</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.identity.puuid} className="border-b border-line/60 hover:bg-bg-hover">
              <td className="py-2 pr-2 text-ink-faint">{i + 1}</td>
              <td className="py-2 pr-2">
                <Link
                  href={`/crew/${crewSlug}/player/${encodeURIComponent(e.identity.riotId + "#" + e.identity.tag)}`}
                  className="flex items-center gap-2 hover:text-accent"
                >
                  <ProfileIcon id={e.identity.profileIcon} name={e.identity.riotId} size={28} />
                  <span className="font-medium">{e.identity.riotId}</span>
                  {e.identity.isStale && <StaleBadge />}
                </Link>
              </td>
              <td className="py-2 pr-2 text-ink-dim">{rankString(slug === "flex" ? e.rankFlex : e.rankSolo)}</td>
              <td className="py-2 pr-2">
                {isArena ? (
                  <span className="stat-num">{e.avgPlacement != null ? placementSuffix(Math.round(e.avgPlacement)) : "—"}</span>
                ) : (
                  <span className="stat-num">
                    {pct(e.winrate)} <SampleSize games={e.games} />
                  </span>
                )}
              </td>
              <td className="py-2 pr-2"><FormBadges form={e.form} /></td>
              <td className="py-2 pr-2 stat-num text-ink-dim">{e.winrate7d != null ? pct(e.winrate7d) : "—"}</td>
              <td className={`py-2 pr-2 stat-num ${(e.vsCrewAvgWinrate ?? 0) >= 0 ? "text-win" : "text-loss"}`}>
                {e.vsCrewAvgWinrate != null ? signedPp(e.vsCrewAvgWinrate) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SynergyPanel({ synergies, minGames }: { synergies: DuoSynergy[]; minGames: number }) {
  if (!synergies.length)
    return <Empty>No duos with {minGames}+ shared games yet. Play more together and they&apos;ll show up here.</Empty>;
  return (
    <ul className="space-y-3">
      {synergies.map((s) => (
        <li key={s.a.puuid + s.b.puuid} className="rounded-lg border border-line bg-bg-raised p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">
              {s.a.riotId} <span className="text-ink-faint">+</span> {s.b.riotId}
            </span>
            <span className="stat-num text-sm">
              {s.wins}–{s.games - s.wins} · {pct(s.winrate)} <SampleSize games={s.games} />
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
            <div className={`h-full ${(s.winrate ?? 0) >= 0.5 ? "bg-accent" : "bg-loss"}`} style={{ width: `${Math.round((s.winrate ?? 0) * 100)}%` }} />
          </div>
          <div className="mt-1 text-xs text-ink-faint">
            apart: {s.a.riotId} {pct(s.aWinrateApart)} · {s.b.riotId} {pct(s.bWinrateApart)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HeadToHeadPanel({ records }: { records: HeadToHead[] }) {
  if (!records.length) return <Empty>No head-to-head games yet (crewmates on opposing sides or different Arena subteams).</Empty>;
  return (
    <ul className="space-y-2">
      {records.map((h) => (
        <li key={h.a.puuid + h.b.puuid} className="flex items-center justify-between rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm">
          <span className={h.aWins >= h.bWins ? "font-semibold text-win" : ""}>{h.a.riotId}</span>
          <span className="stat-num">
            {h.aWins} <span className="text-ink-faint">–</span> {h.bWins}
            <span className="ml-2 text-xs text-ink-faint">{h.games}g</span>
          </span>
          <span className={h.bWins > h.aWins ? "font-semibold text-win" : ""}>{h.b.riotId}</span>
        </li>
      ))}
    </ul>
  );
}

export function FlexRolesPanel({ roles }: { roles: FlexRoleStat[] }) {
  if (!roles.length) return <Empty>No flex games with role data yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
            <th className="py-2 pr-2">Player</th>
            <th className="py-2 pr-2">Role</th>
            <th className="py-2 pr-2">Winrate</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.identity.puuid + r.role} className="border-b border-line/60">
              <td className="py-2 pr-2">{r.identity.riotId}</td>
              <td className="py-2 pr-2 text-ink-dim">{r.role}</td>
              <td className="py-2 pr-2 stat-num">
                {pct(r.winrate)} <SampleSize games={r.games} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <Empty>No shared games yet.</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li key={m.matchId} className="rounded-lg border border-line bg-bg-raised p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-faint">
            <span>{QUEUE_LABEL[m.queueId] ?? "Game"}</span>
            <span>
              {gameDuration(m.gameDuration)} · {timeAgo(m.gameStart)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.members.map((p) => (
              <div
                key={p.puuid}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                  m.queueSlug === "arena"
                    ? "bg-bg-hover"
                    : p.win
                      ? "bg-win/10"
                      : "bg-loss/10"
                }`}
              >
                <ChampIcon name={p.championName} size={20} />
                <span className="font-medium">{p.riotId}</span>
                <span className="stat-num text-ink-dim">{kdaString(p.kills, p.deaths, p.assists)}</span>
                {p.placement != null && <span className="text-ink-faint">{placementSuffix(p.placement)}</span>}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
