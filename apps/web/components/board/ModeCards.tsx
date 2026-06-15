import type { ModeStats } from "@crewstats/shared";
import { QUEUE_LABEL } from "@crewstats/shared";
import { Frame } from "../kit/Frame";
import { ChampIcon } from "../kit/Avatar";
import { CountUp } from "../kit/motion";
import { SampleSize } from "../kit/Badge";
import { pct, placementSuffix } from "@/lib/format";

/**
 * Cross-mode summary as an asymmetric bento — strongest mode (most games) is the
 * larger rim-lit hero. Arena shows average placement (never augment/item win
 * rates — Riot policy). Sample size beside every winrate.
 */
export function ModeCards({ modes }: { modes: ModeStats[] }) {
  if (!modes.length) return null;
  const heroIdx = modes.reduce((b, m, i) => (m.games > (modes[b]?.games ?? -1) ? i : b), 0);
  return (
    <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 lg:grid-cols-4">
      {modes.map((m, i) => (
        <Tile key={m.queueId} mode={m} hero={i === heroIdx && m.games > 0} />
      ))}
    </div>
  );
}

function Tile({ mode: m, hero }: { mode: ModeStats; hero: boolean }) {
  const arena = m.queueSlug === "arena";
  const primary = arena && m.avgPlacement != null ? placementSuffix(Math.round(m.avgPlacement)) : null;
  return (
    <Frame tone={hero ? "lit" : "default"} className={hero ? "lg:col-span-2 lg:row-span-2" : ""}>
      <div className="flex h-full flex-col p-4">
        <div className="text-2xs font-medium uppercase tracking-[0.14em] text-ink-faint">{QUEUE_LABEL[m.queueId]}</div>
        {m.games === 0 ? (
          <div className="mt-3 flex-1 text-sm text-ink-faint">No recent games</div>
        ) : (
          <>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className={`font-display font-bold leading-none ${hero ? "text-4xl" : "text-2xl"}`}>
                {primary ? primary : m.winrate != null ? <CountUp value={m.winrate * 100} suffix="%" /> : "—"}
              </span>
              <SampleSize games={m.games} />
            </div>
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
    </Frame>
  );
}
