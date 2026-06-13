import Link from "next/link";
import type { MatchHistoryItem } from "@crewstats/shared";
import { QUEUE_LABEL } from "@crewstats/shared";
import { ChampIcon } from "./Icons";
import { Empty } from "./ui";
import { kdaString, timeAgo, gameDuration, placementSuffix } from "@/lib/format";

function kdaRatio(k: number, d: number, a: number): string {
  return (d === 0 ? k + a : (k + a) / d).toFixed(2);
}

/**
 * op.gg-style game-by-game list. Win/loss conveyed by a tint AND a W/L glyph
 * (never color alone). Queue label and champion are clickable filters.
 */
export function MatchHistory({
  items,
  basePath,
  region,
  crewSlug,
}: {
  items: MatchHistoryItem[];
  basePath: string;
  region?: string;
  crewSlug?: string;
}) {
  if (!items.length) return <Empty>No games found for this filter.</Empty>;
  return (
    <ul className="space-y-1.5">
      {items.map((m) => {
        const arena = m.queueSlug === "arena";
        const good = arena ? (m.placement ?? 9) <= 4 : m.win;
        return (
          <li
            key={m.matchId}
            className={`flex items-center gap-3 rounded border px-3 py-2.5 ${
              good ? "border-win/25 bg-win/[0.06]" : "border-loss/25 bg-loss/[0.06]"
            }`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm font-mono text-2xs font-bold ${
                good ? "bg-win/20 text-win" : "bg-loss/20 text-loss"
              }`}
              title={arena ? "Arena placement" : m.win ? "Win" : "Loss"}
            >
              {arena ? (m.placement ?? "?") : m.win ? "W" : "L"}
            </span>

            <Link href={`${basePath}?champ=${m.championId}`} className="shrink-0" title={`Filter by ${m.championName}`}>
              <ChampIcon name={m.championName} size={36} />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{m.championName}</span>
                {m.role && <span className="text-2xs text-ink-faint">{m.role}</span>}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-2xs text-ink-faint">
                <Link href={`${basePath}?q=${m.queueSlug}`} className="hover:text-primary" title="Filter by queue">
                  {QUEUE_LABEL[m.queueId] ?? "Game"}
                </Link>
                <span>·</span>
                <span>{timeAgo(m.gameStart)}</span>
                <span>·</span>
                <span>{gameDuration(m.gameDuration)}</span>
              </div>
            </div>

            {m.crewmates.length > 0 && (
              <div className="hidden max-w-[10rem] flex-wrap items-center gap-1 sm:flex">
                {m.crewmates.slice(0, 3).map((c) => (
                  <span
                    key={c.riotId + c.championName}
                    className={`rounded-pill px-1.5 py-0.5 text-[10px] ${
                      c.sameSide ? "bg-surface-3 text-ink-dim" : "bg-loss/15 text-loss"
                    }`}
                    title={c.sameSide ? "Same side" : "Opponent"}
                  >
                    {c.riotId}
                  </span>
                ))}
              </div>
            )}

            <div className="shrink-0 text-right">
              <div className="font-mono text-sm tnum">{kdaString(m.kills, m.deaths, m.assists)}</div>
              <div className="text-2xs text-ink-faint tnum">
                {arena ? placementSuffix(m.placement ?? 0) : `${kdaRatio(m.kills, m.deaths, m.assists)} KDA`}
                {!arena && ` · ${m.cs} CS`}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
