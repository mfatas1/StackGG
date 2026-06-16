import Link from "next/link";
import type { ModeStats, QueueSlug } from "@crewstats/shared";
import { QUEUE_LABEL } from "@crewstats/shared";
import { Frame } from "../kit/Frame";
import { ChampIcon } from "../kit/Avatar";
import { CountUp } from "../kit/motion";
import { SampleSize } from "../kit/Badge";
import { pct, placementSuffix } from "@/lib/format";
import { filterHref } from "@/lib/filters";

/**
 * Cross-mode summary as an asymmetric bento — strongest mode (most games) is the
 * larger rim-lit hero. Arena shows average placement (never augment/item win
 * rates — Riot policy).
 *
 * When `basePath` is passed each card is a queue filter for the match history: click
 * to focus that queue (the card lights up gold, the others dim), click again to clear.
 * Any champion / lane filter is preserved.
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
  const heroIdx = modes.reduce((b, m, i) => (m.games > (modes[b]?.games ?? -1) ? i : b), 0);
  const anySelected = !!active && active !== "all";

  const hrefFor = (slug: QueueSlug) => {
    if (!basePath) return undefined;
    const q = active === slug ? undefined : slug; // toggling the active card clears the queue
    // Drop the champ filter when moving to a queue the champ was never played in (q
    // undefined = "all queues", which always contains the champ's games, so keep it).
    const keepChamp = champ && (q === undefined || champQueues == null || champQueues.includes(slug));
    return filterHref(basePath, { q, champ: keepChamp ? champ : undefined, role });
  };

  return (
    <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 lg:grid-cols-4">
      {modes.map((m, i) => (
        <Tile
          key={m.queueId}
          mode={m}
          hero={i === heroIdx && m.games > 0}
          href={hrefFor(m.queueSlug)}
          selected={active === m.queueSlug}
          dimmed={anySelected && active !== m.queueSlug}
        />
      ))}
    </div>
  );
}

function Tile({
  mode: m,
  hero,
  href,
  selected,
  dimmed,
}: {
  mode: ModeStats;
  hero: boolean;
  href?: string;
  selected?: boolean;
  dimmed?: boolean;
}) {
  const arena = m.queueSlug === "arena";
  const primary = arena && m.avgPlacement != null ? placementSuffix(Math.round(m.avgPlacement)) : null;
  const body = (
    <div className="flex h-full flex-col p-4">
      <div className="text-2xs font-medium uppercase tracking-[0.14em] text-ink-faint">{QUEUE_LABEL[m.queueId]}</div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span
          className={`font-display font-bold leading-none ${selected ? "text-gold" : m.games === 0 ? "text-ink-faint" : ""} ${hero ? "text-4xl" : "text-2xl"}`}
        >
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
          <div className={`mt-3 space-y-1.5 ${hero ? "" : "mt-auto pt-3"}`}>
            {m.topChampions.slice(0, hero ? 3 : 1).map((c) => (
              <div key={c.championId} className="flex items-center gap-2 text-2xs">
                <ChampIcon name={c.championName} size={18} />
                <span className="flex-1 truncate text-ink-dim">{c.championName}</span>
                <span className="text-ink-faint tnum">
                  {c.games}g {c.games ? pct(c.wins / c.games) : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const span = hero ? "lg:col-span-2 lg:row-span-2" : "";
  const focus = selected
    ? "border-gold/70 bg-gold/[0.07] ring-1 ring-gold/40"
    : dimmed
      ? "opacity-45 hover:opacity-100"
      : "";

  if (href) {
    return (
      <Frame tone={hero && !dimmed ? "lit" : "default"} className={`${span} ${focus} cursor-pointer transition-all`}>
        <Link href={href} aria-current={selected ? "true" : undefined} className="block h-full" scroll={false}>
          {body}
        </Link>
      </Frame>
    );
  }
  return (
    <Frame tone={hero ? "lit" : "default"} className={span}>
      {body}
    </Frame>
  );
}
