import type { PlayerIdentity } from "@crewstats/shared";
import type { CrewSession } from "@crewstats/stats";
import { ProfileIcon } from "@/components/kit/Avatar";
import { Empty } from "@/components/kit/Frame";
import { timeAgo } from "@/lib/format";

/**
 * Sessions (docs/competitive-casual-revamp.md, v2) — the stack's nights, grouped from shared
 * games. "Last night: 5-stack, 4W–3L, Mateo carried." The competitive review feed and the
 * casual memory feed at once. Replaces the old recap.
 */
const SIZE_LABEL: Record<number, string> = { 5: "5-stack", 4: "4-stack", 3: "Trio", 2: "Duo" };
const QUEUE_LABEL: Record<CrewSession["queue"], string> = { ranked: "Ranked", flex: "Flex", mixed: "Mixed" };

export function Sessions({ sessions, members }: { sessions: CrewSession[]; members: PlayerIdentity[] }) {
  if (!sessions.length) return <Empty>Play a few games together and your sessions show up here.</Empty>;
  const byId = new Map(members.map((m) => [m.puuid, m]));

  return (
    <ul className="space-y-2">
      {sessions.map((s, i) => {
        const losses = s.games - s.wins;
        const positive = s.wins > losses;
        const top = s.topPuuid ? byId.get(s.topPuuid) : null;
        return (
          <li key={i} className="notch flex items-center gap-3 border border-line bg-surface-2/60 p-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{timeAgo(s.endedAt)}</span>
                <span className="notch notch-sm border border-line bg-bg/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-dim">
                  {SIZE_LABEL[s.size] ?? `${s.size}-stack`}
                </span>
                <span className="text-2xs text-ink-faint">{QUEUE_LABEL[s.queue]}</span>
              </div>
              {top && (
                <div className="mt-1 flex items-center gap-1.5 text-2xs text-ink-dim">
                  <ProfileIcon id={top.profileIcon} name={top.riotId} size={16} />
                  {top.riotId} carried
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className={`font-display text-base font-bold tnum ${positive ? "text-win" : losses > s.wins ? "text-loss" : "text-ink"}`}>
                {s.wins}W {losses}L
              </div>
              <div className="text-2xs text-ink-faint tnum">{s.games} {s.games === 1 ? "game" : "games"}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
