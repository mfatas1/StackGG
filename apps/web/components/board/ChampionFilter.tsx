import Link from "next/link";
import type { ChampPoolEntry } from "@crewstats/stats";
import { ChampIcon } from "../kit/Avatar";
import { filterHref } from "@/lib/filters";
import { pct, champName } from "@/lib/format";

/**
 * Champion pool as a portrait rail — click a champion to filter the match history (and
 * the summary) to it; click again to clear. Most-played first, with games + winrate.
 * Preserves the active queue + lane filters.
 */
export function ChampionFilter({
  champions,
  basePath,
  activeId,
  q,
  role,
}: {
  champions: ChampPoolEntry[];
  basePath: string;
  activeId?: number;
  q?: string;
  role?: string;
}) {
  if (!champions.length) return null;
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {champions.map((c) => {
        const on = activeId === c.championId;
        const href = filterHref(basePath, { q, role, champ: on ? undefined : String(c.championId) });
        return (
          <Link
            key={c.championId}
            href={href}
            aria-current={on ? "true" : undefined}
            scroll={false}
            title={`${champName(c.championName)} · ${c.games}g · ${pct(c.winrate)}`}
            className={`group flex w-[74px] shrink-0 flex-col items-center gap-1 rounded-md border p-1.5 transition-colors ${
              on ? "border-gold/70 bg-gold/10" : "border-transparent hover:border-line/60 hover:bg-surface-2/40"
            }`}
          >
            <span className={`rounded-md p-[2px] ${on ? "bg-gold/60" : (c.winrate ?? 0) >= 0.5 ? "bg-win/40" : "bg-loss/40"}`}>
              <ChampIcon name={c.championName} size={40} />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{champName(c.championName)}</span>
            <span className="whitespace-nowrap font-mono text-[9px] text-ink-faint tnum">
              {c.games}g · {pct(c.winrate)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
