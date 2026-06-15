import { TrendingUp, Users2, Swords, Crown } from "lucide-react";
import type { CrewDashboard } from "@crewstats/shared";
import { Frame } from "../kit/Frame";
import { CountUp } from "../kit/motion";
import { ProfileIcon } from "../kit/Avatar";
import { PlayerLink } from "../kit/links";
import { pct } from "@/lib/format";

/** Asymmetric crew metric rail — 5-stack winrate is the rim-lit hero. */
export function StatRail({ d, crewSlug }: { d: CrewDashboard; crewSlug: string }) {
  const c = d.cards;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-12">
      <Frame tone="lit" className="col-span-2 lg:col-span-5">
        <div className="flex h-full flex-col justify-between p-5">
          <Kicker icon={<Users2 className="h-4 w-4" />} accent>5-stack winrate</Kicker>
          <div className="mt-3">
            <div className="font-display text-5xl font-bold leading-none">
              {c.fiveStackWinrate != null ? <CountUp value={c.fiveStackWinrate * 100} suffix="%" /> : <span className="text-ink-faint">—</span>}
            </div>
            <p className="mt-2 text-sm text-ink-dim">{c.fiveStackGames ? `across ${c.fiveStackGames} full-stack games` : "no full-stack games yet"}</p>
          </div>
        </div>
      </Frame>

      <Frame className="lg:col-span-4">
        <div className="p-5">
          <Kicker icon={<Swords className="h-4 w-4" />}>Best duo</Kicker>
          <div className="mt-3 font-display text-3xl font-bold tnum">{c.bestDuo ? pct(c.bestDuo.winrate) : "—"}</div>
          <p className="mt-1.5 truncate text-sm text-ink-dim">
            {c.bestDuo ? (
              <>
                {c.bestDuo.a.riotId} <span className="text-ink-faint">+</span> {c.bestDuo.b.riotId}
                <span className="text-ink-faint"> · {c.bestDuo.games}g</span>
              </>
            ) : (
              "need 3+ shared games"
            )}
          </p>
        </div>
      </Frame>

      <Frame className="lg:col-span-3">
        <div className="p-5">
          <Kicker icon={<TrendingUp className="h-4 w-4" />}>Games this week</Kicker>
          <div className="mt-3 font-display text-3xl font-bold">
            <CountUp value={c.gamesThisWeek} />
          </div>
          <p className="mt-1.5 text-sm text-ink-dim tnum">{c.totalSharedGames} shared all-time</p>
        </div>
      </Frame>

      <Frame className="col-span-2 lg:col-span-12">
        <div className="flex items-center gap-4 p-5">
          <span className="notch grid h-10 w-10 shrink-0 place-items-center bg-gold/15 text-gold">
            <Crown className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <Kicker>Biggest climber this week</Kicker>
            {c.biggestClimber ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ProfileIcon id={c.biggestClimber.identity.profileIcon} name={c.biggestClimber.identity.riotId} size={24} />
                <PlayerLink riotId={c.biggestClimber.identity.riotId} tag={c.biggestClimber.identity.tag} region={c.biggestClimber.identity.region} crewSlug={crewSlug} className="font-display text-lg font-bold" />
                <span className={`font-mono text-sm tnum ${c.biggestClimber.lpDelta >= 0 ? "text-win" : "text-loss"}`}>
                  {c.biggestClimber.lpDelta > 0 ? "+" : ""}
                  {c.biggestClimber.lpDelta} net W–L
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink-dim">no ranked games this week</p>
            )}
          </div>
        </div>
      </Frame>
    </div>
  );
}

function Kicker({ icon, accent, children }: { icon?: React.ReactNode; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.14em] text-ink-faint">
      {icon && <span className={accent ? "text-primary" : "text-ink-faint"}>{icon}</span>}
      {children}
    </div>
  );
}
