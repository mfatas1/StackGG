import type { CrewRoleSpread } from "@crewstats/stats";
import { ProfileIcon, RoleIcon, ChampIcon } from "../kit/Avatar";
import { Empty } from "../kit/Frame";
import { PlayerLink, playerHref } from "../kit/links";
import { RIFT_MAP_URL, pct } from "@/lib/format";
import Link from "next/link";

// Lane anchors on the Summoner's Rift minimap (origin top-left; blue base
// bottom-left, red base top-right).
const LANES: { key: string; label: string; x: number; y: number }[] = [
  { key: "TOP", label: "Top", x: 17, y: 19 },
  { key: "JUNGLE", label: "Jungle", x: 38, y: 46 },
  { key: "MIDDLE", label: "Mid", x: 50, y: 50 },
  { key: "BOTTOM", label: "Bot", x: 82, y: 81 },
  { key: "UTILITY", label: "Support", x: 70, y: 89 },
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

/**
 * The crew's strongest pick in each lane, placed on the Rift — the highest-winrate
 * player per position (not everyone on their main lane), with their go-to champs.
 */
export function RiftMap({ rows, crewSlug }: { rows: CrewRoleSpread[]; crewSlug: string }) {
  if (!rows.length) return <Empty>Play ranked or flex and the lane leaders show up on the Rift.</Empty>;
  const best = LANES.map((l) => ({ lane: l, player: bestForLane(rows, l.key) }));

  return (
    <div>
      <div className="hex-corners relative mx-auto aspect-square w-full max-w-md overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={RIFT_MAP_URL} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-70" style={{ filter: "brightness(0.7) saturate(1.05)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_52%,oklch(var(--bg)/0.85))]" />

        {best.map(({ lane, player }) => (
          <div key={lane.key} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${lane.x}%`, top: `${lane.y}%` }}>
            {player ? (
              <Link
                href={playerHref({ riotId: player.riotId, tag: player.tag, region: player.region, crewSlug })}
                className="group flex flex-col items-center"
                title={`${lane.label} · ${player.riotId} · ${pct(player.winrate)} (${player.games}g)`}
              >
                <span className={`relative rounded-full p-[2px] transition-transform duration-150 group-hover:scale-110 ${(player.winrate ?? 0) >= 0.5 ? "bg-win" : "bg-loss"}`}>
                  <ProfileIcon id={player.profileIcon} name={player.riotId} size={34} />
                  <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-bg ring-1 ring-line">
                    <RoleIcon role={lane.key} size={11} />
                  </span>
                </span>
                <span className="mt-1 whitespace-nowrap rounded-sm bg-bg/85 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                  {player.riotId} · <span className={(player.winrate ?? 0) >= 0.5 ? "text-win" : "text-loss"}>{pct(player.winrate)}</span>
                </span>
              </Link>
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-bg/60 text-ink-faint/60 ring-1 ring-line/60" title={`${lane.label} · no one yet`}>
                <RoleIcon role={lane.key} size={14} />
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Lane leaders + their go-to champs */}
      <ul className="mt-4 divide-y divide-line/40">
        {best.map(({ lane, player }) => (
          <li key={lane.key} className="flex items-center gap-2.5 py-1.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-surface-2/60">
              <RoleIcon role={lane.key} size={14} />
            </span>
            <span className="w-14 shrink-0 text-2xs uppercase tracking-wide text-ink-faint">{lane.label}</span>
            {player ? (
              <>
                <PlayerLink riotId={player.riotId} tag={player.tag} region={player.region} crewSlug={crewSlug} className="min-w-0 truncate text-sm font-medium" />
                <span className={`shrink-0 font-mono text-2xs tnum ${(player.winrate ?? 0) >= 0.5 ? "text-win" : "text-loss"}`}>{pct(player.winrate)}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {player.champions.slice(0, 3).map((c) => (
                    <span key={c.championName} title={`${c.championName} · ${c.games}g · ${pct(c.games ? c.wins / c.games : null)}`}>
                      <ChampIcon name={c.championName} size={20} />
                    </span>
                  ))}
                </span>
              </>
            ) : (
              <span className="text-2xs text-ink-faint">no one yet</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
