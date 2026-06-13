import type { Award } from "@crewstats/shared";
import { Empty } from "./ui";
import { PlayerLink } from "./links";

export function CrewAwards({ awards, crewSlug }: { awards: Award[]; crewSlug: string }) {
  if (!awards.length) return <Empty>No records yet. Play some games and the awards will fill in.</Empty>;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {awards.map((a) => (
        <div key={a.key} className="rounded-lg border border-line bg-surface-2/60 p-4">
          <div className="text-2xs font-medium uppercase tracking-wide text-ink-faint">{a.label}</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-gold tnum">{a.value}</span>
          </div>
          <div className="mt-1.5 truncate text-sm font-medium">
            <PlayerLink riotId={a.holder.riotId} tag={a.holder.tag} region={a.holder.region} crewSlug={crewSlug} />
          </div>
          <div className="truncate text-2xs text-ink-faint">{a.sub}</div>
        </div>
      ))}
    </div>
  );
}
