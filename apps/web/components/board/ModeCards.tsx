import Link from "next/link";
import type { ModeStats, QueueSlug } from "@crewstats/shared";
import { QUEUE_LABEL } from "@crewstats/shared";
import { Frame } from "../kit/Frame";
import { ChampIcon } from "../kit/Avatar";
import { CountUp } from "../kit/motion";
import { SampleSize } from "../kit/Badge";
import { pct, placementSuffix, champName } from "@/lib/format";
import { filterHref } from "@/lib/filters";

// Champion winrate colour: blue (top tier) above 60%, green 50–60%, red below. Gold is
// reserved for MVP only, so it doesn't read as a middle yellow between red and green.
const champTone = (wr: number) => (wr > 0.6 ? "text-elite" : wr >= 0.5 ? "text-win" : "text-loss");

/**
 * Mode summary. The two ranked queues (solo + flex) are the primary pair — equal height,
 * the one with more games wider, each filled with the player's champions. ARAM then Arena
 * sit beside them as compact winrate/KDA boxes (no champions).
 *
 * When `basePath` is passed each box filters the match history: click to focus that queue
 * (gold, others dim), click again to clear. Champion / lane filters are preserved.
 */
export function ModeCards({
  modes,
  basePath,
  active,
  champ,
  role,
  champQueues,
}: {
  modes: ModeStats[];
  basePath?: string;
  active?: QueueSlug;
  champ?: string;
  role?: string;
  champQueues?: string[];
}) {
  if (!modes.length) return null;
  const ranked = modes.filter((m) => m.queueSlug === "ranked" || m.queueSlug === "flex").sort((a, b) => b.games - a.games);
  const minis = (["aram", "arena"] as const)
    .map((s) => modes.find((m) => m.queueSlug === s))
    .filter((m): m is ModeStats => !!m);
  const anySelected = !!active && active !== "all";

  const hrefFor = (slug: QueueSlug) => {
    if (!basePath) return undefined;
    const q = active === slug ? undefined : slug;
    const keepChamp = champ && (q === undefined || champQueues == null || champQueues.includes(slug));
    return filterHref(basePath, { q, champ: keepChamp ? champ : undefined, role });
  };
  const props = (m: ModeStats) => ({
    mode: m,
    href: hrefFor(m.queueSlug),
    selected: active === m.queueSlug,
    dimmed: anySelected && active !== m.queueSlug,
  });

  return (
    <div className="grid gap-3 lg:grid-cols-3 lg:items-start">
      {ranked.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-[1.4fr_1fr]">
          {ranked.map((m) => (
            <Tile key={m.queueId} {...props(m)} />
          ))}
        </div>
      )}
      {minis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {minis.map((m) => (
            <Tile key={m.queueId} mini {...props(m)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({
  mode: m,
  href,
  selected,
  dimmed,
  mini = false,
}: {
  mode: ModeStats;
  href?: string;
  selected?: boolean;
  dimmed?: boolean;
  mini?: boolean;
}) {
  const arena = m.queueSlug === "arena";
  const primary = arena && m.avgPlacement != null ? placementSuffix(Math.round(m.avgPlacement)) : null;
  const body = (
    <div className="flex h-full flex-col p-4">
      <div className="text-2xs font-medium uppercase tracking-[0.14em] text-ink-faint">{QUEUE_LABEL[m.queueId]}</div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className={`font-display font-bold leading-none ${selected ? "text-gold" : m.games === 0 ? "text-ink-faint" : ""} ${mini ? "text-2xl" : "text-3xl"}`}>
          {m.games === 0 ? "—" : primary ? primary : m.winrate != null ? <CountUp value={m.winrate * 100} suffix="%" /> : "—"}
        </span>
        <SampleSize games={m.games} />
      </div>
      {m.games === 0 ? (
        <div className="mt-1.5 text-2xs text-ink-faint">No games yet</div>
      ) : (
        <>
          <div className="mt-1.5 font-mono text-2xs text-ink-dim tnum">
            {m.avgKills}/{m.avgDeaths}/{m.avgAssists} · {m.kda.toFixed(2)} KDA
          </div>
          {!mini && m.topChampions.length > 0 && (
            <ul className="mt-3 flex-1 space-y-1.5">
              {m.topChampions.map((c) => {
                const wr = c.games ? c.wins / c.games : 0;
                return (
                  <li key={c.championId} className="flex items-center gap-2 text-2xs">
                    <ChampIcon name={c.championName} size={18} />
                    <span className="flex-1 truncate text-ink-dim">{champName(c.championName)}</span>
                    <span className="tnum">
                      <span className="text-ink-faint">{c.games}g</span>{" "}
                      {c.games ? <span className={`font-semibold ${champTone(wr)}`}>{pct(wr)}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );

  const focus = selected ? "border-gold/70 bg-gold/[0.07] ring-1 ring-gold/40" : dimmed ? "opacity-45 hover:opacity-100" : "";
  const tone = mini ? "default" : "lit";

  if (href) {
    return (
      <Frame tone={tone} className={`h-full ${focus} cursor-pointer transition-all`}>
        <Link href={href} aria-current={selected ? "true" : undefined} className="block h-full" scroll={false}>
          {body}
        </Link>
      </Frame>
    );
  }
  return (
    <Frame tone={tone} className="h-full">
      {body}
    </Frame>
  );
}
