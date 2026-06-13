import { Crown, TrendingUp, Users2, Swords } from "lucide-react";
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
import { Bar, FormPills, SampleSize, Empty, tierTone } from "./ui";
import { PlayerLink } from "./links";
import { pct, signedPp, rankString, kdaString, timeAgo, gameDuration, placementSuffix } from "@/lib/format";

export function MetricCards({ d }: { d: CrewDashboard }) {
  const c = d.cards;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={<TrendingUp className="h-4 w-4" />}
        label="Games this week"
        value={String(c.gamesThisWeek)}
        sub={`${c.totalSharedGames} shared all-time`}
      />
      <Tile
        icon={<Users2 className="h-4 w-4" />}
        label="5-stack winrate"
        value={c.fiveStackWinrate != null ? pct(c.fiveStackWinrate) : "—"}
        sub={c.fiveStackGames ? `${c.fiveStackGames} full-stack games` : "no full-stack games yet"}
      />
      <Tile
        icon={<Swords className="h-4 w-4" />}
        label="Best duo"
        value={c.bestDuo ? pct(c.bestDuo.winrate) : "—"}
        sub={c.bestDuo ? `${c.bestDuo.a.riotId} + ${c.bestDuo.b.riotId} · ${c.bestDuo.games}g` : "need 3+ shared games"}
      />
      <Tile
        icon={<Crown className="h-4 w-4" />}
        label="Biggest climber"
        value={c.biggestClimber ? c.biggestClimber.identity.riotId : "—"}
        sub={
          c.biggestClimber
            ? `${c.biggestClimber.lpDelta > 0 ? "+" : ""}${c.biggestClimber.lpDelta} net W–L this week`
            : "no ranked games this week"
        }
        accent
      />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-primary/30 bg-primary/[0.07]" : "border-line bg-surface-2/60"}`}>
      <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-ink-faint">
        <span className={accent ? "text-primary" : "text-ink-faint"}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 truncate font-display text-2xl font-bold tnum">{value}</div>
      <div className="mt-1 truncate text-xs text-ink-dim">{sub}</div>
    </div>
  );
}

export function Leaderboard({ entries, slug, crewSlug }: { entries: LeaderboardEntry[]; slug: string; crewSlug: string }) {
  if (!entries.length) return <Empty>No games ingested yet for this mode.</Empty>;
  const isArena = slug === "arena";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-faint">
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Player</th>
            <th className="px-3 py-2.5 font-medium">Rank</th>
            <th className="px-3 py-2.5 font-medium">{isArena ? "Avg place" : "Winrate"}</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Form</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">7d</th>
            <th className="px-3 py-2.5 text-right font-medium">vs crew</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.identity.puuid} className="border-b border-line/50 transition-colors hover:bg-surface-3/50">
              <td className="px-3 py-2.5">
                {i === 0 ? (
                  <Crown className="h-4 w-4 text-gold" />
                ) : (
                  <span className="font-mono text-ink-faint">{i + 1}</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <PlayerLink
                  riotId={e.identity.riotId}
                  tag={e.identity.tag}
                  region={e.identity.region}
                  crewSlug={crewSlug}
                  className="flex items-center gap-2 font-medium"
                >
                  <ProfileIcon id={e.identity.profileIcon} name={e.identity.riotId} size={26} />
                  <span className="truncate">{e.identity.riotId}</span>
                  {e.identity.isStale && (
                    <span className="rounded bg-gold/15 px-1 py-0.5 text-[10px] text-gold">stale</span>
                  )}
                </PlayerLink>
              </td>
              <td className={`px-3 py-2.5 text-xs ${tierTone((slug === "flex" ? e.rankFlex : e.rankSolo)?.tier)}`}>
                {rankString(slug === "flex" ? e.rankFlex : e.rankSolo)}
              </td>
              <td className="px-3 py-2.5">
                {isArena ? (
                  <span className="font-mono tnum">
                    {e.avgPlacement != null ? placementSuffix(Math.round(e.avgPlacement)) : "—"}
                  </span>
                ) : (
                  <div className="flex w-40 items-center gap-2">
                    <span className="w-9 font-mono tnum">{pct(e.winrate)}</span>
                    <div className="flex-1">
                      <Bar value={e.winrate} tone="auto" />
                    </div>
                    <SampleSize games={e.games} />
                  </div>
                )}
              </td>
              <td className="hidden px-3 py-2.5 sm:table-cell">
                <FormPills form={e.form} />
              </td>
              <td className="hidden px-3 py-2.5 font-mono text-ink-dim tnum md:table-cell">
                {e.winrate7d != null ? pct(e.winrate7d) : "—"}
              </td>
              <td className={`px-3 py-2.5 text-right font-mono tnum ${(e.vsCrewAvgWinrate ?? 0) >= 0 ? "text-win" : "text-loss"}`}>
                {e.vsCrewAvgWinrate != null ? signedPp(e.vsCrewAvgWinrate) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SynergyPanel({ synergies, minGames, crewSlug }: { synergies: DuoSynergy[]; minGames: number; crewSlug: string }) {
  if (!synergies.length)
    return <Empty>No duos with {minGames}+ shared games yet. Play more together and they&apos;ll show up here.</Empty>;
  return (
    <ul className="space-y-2.5">
      {synergies.map((s) => (
        <li key={s.a.puuid + s.b.puuid} className="rounded border border-line bg-surface-2/60 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium">
              <PlayerLink riotId={s.a.riotId} tag={s.a.tag} region={s.a.region} crewSlug={crewSlug} />
              <span className="px-1 text-ink-faint">+</span>
              <PlayerLink riotId={s.b.riotId} tag={s.b.tag} region={s.b.region} crewSlug={crewSlug} />
            </span>
            <span className="shrink-0 font-mono tnum">
              {s.wins}–{s.games - s.wins} · {pct(s.winrate)} <SampleSize games={s.games} />
            </span>
          </div>
          <Bar value={s.winrate} tone="primary" />
          <div className="mt-1.5 text-2xs text-ink-faint">
            apart: {s.a.riotId} {pct(s.aWinrateApart)} · {s.b.riotId} {pct(s.bWinrateApart)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HeadToHeadPanel({ records, crewSlug }: { records: HeadToHead[]; crewSlug: string }) {
  if (!records.length)
    return <Empty>No head-to-head games yet (crewmates on opposing sides or different Arena subteams).</Empty>;
  return (
    <ul className="space-y-2">
      {records.map((h) => (
        <li
          key={h.a.puuid + h.b.puuid}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded border border-line bg-surface-2/60 px-3 py-2.5 text-sm"
        >
          <PlayerLink
            riotId={h.a.riotId}
            tag={h.a.tag}
            region={h.a.region}
            crewSlug={crewSlug}
            className={`truncate text-right ${h.aWins >= h.bWins ? "font-semibold text-win" : "text-ink-dim"}`}
          />
          <span className="font-mono tnum">
            {h.aWins}<span className="px-1 text-ink-faint">–</span>{h.bWins}
            <span className="ml-1.5 text-2xs text-ink-faint">{h.games}g</span>
          </span>
          <PlayerLink
            riotId={h.b.riotId}
            tag={h.b.tag}
            region={h.b.region}
            crewSlug={crewSlug}
            className={`truncate ${h.bWins > h.aWins ? "font-semibold text-win" : "text-ink-dim"}`}
          />
        </li>
      ))}
    </ul>
  );
}

export function FlexRolesPanel({ roles, crewSlug }: { roles: FlexRoleStat[]; crewSlug: string }) {
  if (!roles.length) return <Empty>No flex games with role data yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-faint">
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Winrate</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.identity.puuid + r.role} className="border-b border-line/50">
              <td className="px-3 py-2">
                <PlayerLink riotId={r.identity.riotId} tag={r.identity.tag} region={r.identity.region} crewSlug={crewSlug} className="font-medium" />
              </td>
              <td className="px-3 py-2 text-ink-dim">{r.role}</td>
              <td className="px-3 py-2 font-mono tnum">
                {pct(r.winrate)} <SampleSize games={r.games} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityFeed({ items, crewSlug }: { items: ActivityItem[]; crewSlug: string }) {
  if (!items.length) return <Empty>No shared games yet.</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li key={m.matchId} className="rounded border border-line bg-surface-2/60 p-3">
          <div className="mb-2 flex items-center justify-between text-2xs text-ink-faint">
            <span className="font-medium text-ink-dim">{QUEUE_LABEL[m.queueId] ?? "Game"}</span>
            <span>
              {gameDuration(m.gameDuration)} · {timeAgo(m.gameStart)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {m.members.map((p) => {
              const good = m.queueSlug === "arena" ? (p.placement ?? 9) <= 4 : p.win;
              return (
                <div
                  key={p.puuid}
                  className={`flex items-center gap-1.5 rounded-pill py-1 pl-1 pr-2.5 text-xs ${
                    good ? "bg-win/10" : "bg-loss/10"
                  }`}
                >
                  <ChampIcon name={p.championName} size={20} />
                  <span className="font-medium">{p.riotId}</span>
                  <span className="font-mono text-ink-dim tnum">{kdaString(p.kills, p.deaths, p.assists)}</span>
                  {p.placement != null && <span className="text-ink-faint">{placementSuffix(p.placement)}</span>}
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
