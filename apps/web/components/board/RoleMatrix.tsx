"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CrewRoleSpread } from "@crewstats/stats";
import { ProfileIcon, RoleIcon, ChampIcon } from "../kit/Avatar";
import { PlayerLink } from "../kit/links";
import { Empty } from "../kit/Frame";
import { pct, champName } from "@/lib/format";

const LANES = [
  { key: "TOP", label: "Top" },
  { key: "JUNGLE", label: "Jng" },
  { key: "MIDDLE", label: "Mid" },
  { key: "BOTTOM", label: "Bot" },
  { key: "UTILITY", label: "Sup" },
];

type Champ = { championName: string; games: number; wins: number };
type Hover = { name: string; lane: string; champs: Champ[]; x: number; y: number };

/**
 * Crew role heatmap — each member's spread across all five lanes (not one role
 * each), so the grid fills in. Cell intensity = how much they play that lane;
 * winrate shown once it clears 3 games. Hover a cell to see that player's top 3
 * champs in that lane with winrates. Column totals reveal the crowded lane and
 * any coverage gap (a column nobody plays).
 */
export function RoleMatrix({ rows, crewSlug, fill }: { rows: CrewRoleSpread[]; crewSlug: string; fill?: boolean }) {
  const [hover, setHover] = useState<Hover | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!rows.length) return <Empty>Play ranked or flex and the stack&apos;s role map fills in here.</Empty>;

  const laneTotals = LANES.map((l) => rows.reduce((s, r) => s + (r.roles[l.key]?.games ?? 0), 0));
  const cellH = fill ? "h-full min-h-[2.5rem]" : "h-11";

  return (
    <div className={fill ? "flex h-full flex-col" : ""}>
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_repeat(5,2.6rem)] items-end gap-1.5 px-1 pb-1.5 sm:grid-cols-[minmax(0,1fr)_repeat(5,3rem)]">
        <span />
        {LANES.map((l, i) => (
          <div key={l.key} className="flex flex-col items-center gap-0.5">
            <RoleIcon role={l.key} size={15} />
            <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{l.label}</span>
            <span className="font-mono text-[10px] text-ink-faint/70 tnum">{laneTotals[i]}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className={fill ? "flex flex-1 flex-col gap-1" : "space-y-1"}>
        {rows.map((r) => {
          const playerMax = Math.max(1, ...LANES.map((l) => r.roles[l.key]?.games ?? 0));
          return (
            <div key={r.identity.puuid} className={`grid grid-cols-[minmax(0,1fr)_repeat(5,2.6rem)] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_repeat(5,3rem)] ${fill ? "flex-1" : ""}`}>
              <PlayerLink
                riotId={r.identity.riotId}
                tag={r.identity.tag}
                region={r.identity.region}
                crewSlug={crewSlug}
                className="flex min-w-0 items-center gap-2"
              >
                <ProfileIcon id={r.identity.profileIcon} name={r.identity.riotId} size={24} />
                <span className="truncate text-sm font-medium">{r.identity.riotId}</span>
              </PlayerLink>

              {LANES.map((l) => {
                const cell = r.roles[l.key];
                const games = cell?.games ?? 0;
                if (!games) {
                  return (
                    <span key={l.key} className={`notch notch-sm grid ${cellH} place-items-center bg-surface-2/30 text-ink-faint/40`}>
                      ·
                    </span>
                  );
                }
                const intensity = 0.16 + 0.5 * (games / playerMax);
                const primary = games === playerMax;
                const wr = cell!.winrate;
                return (
                  <span
                    key={l.key}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHover({ name: r.identity.riotId, lane: l.label, champs: cell!.champions, x: rect.left + rect.width / 2, y: rect.top });
                    }}
                    onMouseLeave={() => setHover(null)}
                    className={`notch notch-sm grid ${cellH} cursor-default place-content-center bg-primary text-center ${primary ? "ring-1 ring-primary/60" : ""}`}
                    style={{ backgroundColor: `oklch(var(--primary) / ${intensity})` }}
                  >
                    <span className="font-mono text-sm font-semibold leading-none tnum text-ink">{games}</span>
                    {games >= 3 && wr != null && (
                      <span className={`mt-0.5 font-mono text-[10px] leading-none tnum ${wr >= 0.5 ? "text-win" : "text-loss"}`}>{pct(wr)}</span>
                    )}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 px-1 text-2xs text-ink-faint">Cell = games in that lane · hover for top champs · winrate shown at 3+ games · numbers under each lane are the stack total.</p>

      {mounted && hover &&
        createPortal(
          <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full" style={{ left: hover.x, top: hover.y - 8 }}>
            <div className="notch notch-sm min-w-[11rem] border border-line bg-bg/95 p-2 shadow-xl backdrop-blur-md">
              <div className="mb-1.5 text-2xs uppercase tracking-[0.1em] text-ink-faint">
                <span className="font-semibold text-ink-dim">{hover.name}</span> · {hover.lane}
              </div>
              {hover.champs.length ? (
                <ul className="space-y-1">
                  {hover.champs.map((c) => {
                    const cwr = c.games ? c.wins / c.games : null;
                    return (
                      <li key={c.championName} className="flex items-center gap-2">
                        <ChampIcon name={c.championName} size={20} />
                        <span className="flex-1 whitespace-nowrap text-xs font-medium">{champName(c.championName)}</span>
                        <span className="font-mono text-2xs text-ink-faint tnum">{c.games}g</span>
                        <span className={`w-9 text-right font-mono text-2xs tnum ${cwr != null && cwr >= 0.5 ? "text-win" : "text-loss"}`}>{pct(cwr)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-2xs text-ink-faint">No champion data.</div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
