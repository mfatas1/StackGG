import type { CrewRoleSpread } from "@crewstats/stats";
import { ProfileIcon, RoleIcon, ChampIcon } from "../kit/Avatar";
import { Empty } from "../kit/Frame";
import { PlayerLink, playerHref } from "../kit/links";
import { pct, champName } from "@/lib/format";
import Link from "next/link";

const LANES: { key: string; label: string }[] = [
  { key: "TOP", label: "Top" },
  { key: "JUNGLE", label: "Jungle" },
  { key: "MIDDLE", label: "Mid" },
  { key: "BOTTOM", label: "Bot" },
  { key: "UTILITY", label: "Support" },
];

const MIN = 3;

type Champ = { championName: string; games: number; wins: number };
type Best = { riotId: string; tag: string; region: string; profileIcon: number | null; games: number; winrate: number | null; champions: Champ[] };

/** Pick the highest-winrate player for a lane (>= MIN games; else the most-played). */
function bestForLane(rows: CrewRoleSpread[], lane: string): Best | null {
  const cands = rows
    .map((r) => ({ id: r.identity, cell: r.roles[lane] }))
    .filter((c): c is { id: CrewRoleSpread["identity"]; cell: NonNullable<CrewRoleSpread["roles"][string]> } => !!c.cell && c.cell.games > 0);
  if (!cands.length) return null;
  const ranked = cands.filter((c) => c.cell.games >= MIN);
  const pool = ranked.length ? ranked : cands;
  const pick = pool.reduce((b, c) =>
    !b || (c.cell.winrate ?? 0) > (b.cell.winrate ?? 0) || ((c.cell.winrate ?? 0) === (b.cell.winrate ?? 0) && c.cell.games > b.cell.games) ? c : b,
  );
  return {
    riotId: pick.id.riotId,
    tag: pick.id.tag,
    region: pick.id.region,
    profileIcon: pick.id.profileIcon,
    games: pick.cell.games,
    winrate: pick.cell.winrate,
    champions: pick.cell.champions,
  };
}

const wrTone = (w: number | null) => ((w ?? 0) >= 0.5 ? "text-win" : "text-loss");

/**
 * The crew's strongest pick in each lane, as a wide "epic" banner per role: the lane
 * title large, the lane's best player, and their top-3 champs with games + winrate.
 */
export function LaneLeaders({ rows, crewSlug }: { rows: CrewRoleSpread[]; crewSlug: string }) {
  if (!rows.length) return <Empty>Play ranked or flex and your lane leaders show up here.</Empty>;
  const best = LANES.map((l) => ({ lane: l, player: bestForLane(rows, l.key) }));

  return (
    <div className="space-y-3">
      {best.map(({ lane, player }) => (
        <div key={lane.key} className="notch relative overflow-hidden border border-line/60 bg-surface-2/40">
          {/* giant role watermark */}
          <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 opacity-[0.05]">
            <RoleIcon role={lane.key} size={150} />
          </span>
          {/* left accent rail */}
          <div className={`absolute inset-y-0 left-0 w-1 ${player && (player.winrate ?? 0) >= 0.5 ? "bg-win/70" : "bg-loss/60"}`} />

          <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:gap-5">
            {/* Lane title */}
            <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-bg/50 ring-1 ring-line/60">
                <RoleIcon role={lane.key} size={24} />
              </span>
              <div className="leading-none">
                <div className="font-display text-2xl font-extrabold uppercase tracking-tight">{lane.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-faint">lane leader</div>
              </div>
            </div>

            {/* The player who owns the lane */}
            {player ? (
              <Link
                href={playerHref({ riotId: player.riotId, tag: player.tag, region: player.region, crewSlug })}
                className="group flex items-center gap-3 sm:w-52 sm:shrink-0"
              >
                <span className={`shrink-0 rounded-full p-[2px] transition-transform duration-150 group-hover:scale-105 ${(player.winrate ?? 0) >= 0.5 ? "bg-win" : "bg-loss"}`}>
                  <ProfileIcon id={player.profileIcon} name={player.riotId} size={48} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold group-hover:text-gold">{player.riotId}</div>
                  <div className="mt-0.5 font-mono text-2xs tnum">
                    <span className={`text-base font-bold ${wrTone(player.winrate)}`}>{pct(player.winrate)}</span>
                    <span className="text-ink-faint"> · {player.games}g</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 text-sm text-ink-faint sm:w-52 sm:shrink-0">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-bg/50 ring-1 ring-line/50">
                  <RoleIcon role={lane.key} size={18} />
                </span>
                no one yet
              </div>
            )}

            {/* Their go-to champions, with stats */}
            {player && player.champions.length > 0 && (
              <div className="grid flex-1 grid-cols-3 gap-2">
                {player.champions.slice(0, 3).map((c) => {
                  const w = c.games ? c.wins / c.games : null;
                  return (
                    <div key={c.championName} className="notch-sm flex items-center gap-2 border border-line/40 bg-bg/40 px-2 py-1.5">
                      <ChampIcon name={c.championName} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{champName(c.championName)}</div>
                        <div className="font-mono text-[10px] text-ink-faint tnum">
                          {c.games}g · <span className={wrTone(w)}>{pct(w)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
