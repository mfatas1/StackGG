"use client";
import Link from "next/link";
import type { RolePlacement } from "@crewstats/shared";
import { RIFT_MAP_URL, pct } from "@/lib/format";
import { ProfileIcon } from "@/components/Icons";
import { RoleIcon } from "./RoleIcon";
import { playerHref } from "@/components/links";

// Normalized anchor positions for each lane on the Summoner's Rift minimap
// (origin top-left; blue base bottom-left, red base top-right).
const ANCHOR: Record<string, { x: number; y: number }> = {
  TOP: { x: 20, y: 19 },
  JUNGLE: { x: 37, y: 45 },
  MIDDLE: { x: 50, y: 50 },
  BOTTOM: { x: 81, y: 81 },
  UTILITY: { x: 69, y: 89 },
};

export function CrewRift({ placements, crewSlug }: { placements: RolePlacement[]; crewSlug: string }) {
  // Group members by primary role so shared lanes fan out instead of overlapping.
  const byRole = new Map<string, RolePlacement[]>();
  for (const p of placements) {
    const r = p.role.toUpperCase();
    if (!ANCHOR[r]) continue;
    if (!byRole.has(r)) byRole.set(r, []);
    byRole.get(r)!.push(p);
  }

  return (
    <div className="hex-corners relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg border border-line">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${RIFT_MAP_URL})`, filter: "saturate(1.05) brightness(0.78)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(1,10,19,0.72))" }}
      />

      {placements.length === 0 && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-ink-faint">
          Play some ranked or flex games and the crew will appear on the rift.
        </div>
      )}

      {[...byRole.entries()].flatMap(([role, members]) =>
        members.map((m, i) => {
          const a = ANCHOR[role]!;
          const x = a.x + (i - (members.length - 1) / 2) * 11;
          const good = (m.winrate ?? 0) >= 0.5;
          return (
            <Link
              key={m.identity.puuid}
              href={playerHref({ riotId: m.identity.riotId, tag: m.identity.tag, region: m.identity.region, crewSlug })}
              style={{ left: `${x}%`, top: `${a.y}%` }}
              className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            >
              <span
                className={`relative rounded-full p-[2px] transition-transform duration-200 ease-out-quint group-hover:scale-110 ${good ? "bg-win" : "bg-loss"}`}
                title={`${m.identity.riotId} · ${role} · ${pct(m.winrate)} (${m.games}g)`}
              >
                <ProfileIcon id={m.identity.profileIcon} name={m.identity.riotId} size={34} />
                <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-bg ring-1 ring-line">
                  <RoleIcon role={role} size={11} />
                </span>
              </span>
              <span className="mt-1 whitespace-nowrap rounded bg-bg/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                {m.identity.riotId} · <span className={good ? "text-win" : "text-loss"}>{pct(m.winrate)}</span>
              </span>
            </Link>
          );
        }),
      )}
    </div>
  );
}
