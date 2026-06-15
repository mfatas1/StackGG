"use client";
import { useState } from "react";
import { champIcon, profileIcon, tierCrest, roleIcon, rankString } from "@/lib/format";
import { tierTone } from "./Badge";
import type { RankInfo, PlayerIdentity } from "@crewstats/shared";
import { PlayerLink } from "./links";

const NOTCH = { clipPath: "polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)" };

/** Square champion portrait in a notched Hextech slot, initials fallback. */
export function ChampIcon({ name, size = 32 }: { name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err)
    return (
      <span className="grid place-items-center bg-surface-3 text-[10px] font-medium text-ink-dim" style={{ width: size, height: size, ...NOTCH }} title={name}>
        {name.slice(0, 2)}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={champIcon(name)} alt={name} width={size} height={size} title={name} style={NOTCH} onError={() => setErr(true)} />
  );
}

/** Profile portrait with a gold frame — the "summoner plate" avatar. */
export function ProfileIcon({ id, name, size = 40, framed = false }: { id: number | null; name: string; size?: number; framed?: boolean }) {
  const [err, setErr] = useState(false);
  const url = profileIcon(id);
  const ring = framed ? "ring-1 ring-gold/60" : "";
  if (!url || err)
    return (
      <span className={`grid place-items-center rounded-full bg-surface-3 text-xs font-semibold text-ink-dim ${ring}`} style={{ width: size, height: size }} title={name}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} width={size} height={size} title={name} className={`rounded-full ${ring}`} onError={() => setErr(true)} />
  );
}

export function RankCrest({ rank, size = 22, withText = true }: { rank: RankInfo | null; size?: number; withText?: boolean }) {
  const [err, setErr] = useState(false);
  const url = tierCrest(rank?.tier);
  return (
    <span className="inline-flex items-center gap-1.5">
      {url && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={rank?.tier ?? ""} width={size} height={size} onError={() => setErr(true)} className="shrink-0" />
      ) : (
        <span className="inline-block shrink-0 rounded-full bg-surface-3" style={{ width: size, height: size }} />
      )}
      {withText && <span className={`text-xs ${tierTone(rank?.tier)}`}>{rankString(rank)}</span>}
    </span>
  );
}

export function RoleIcon({ role, size = 16 }: { role: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const url = roleIcon(role);
  if (!url || err) return <span className="inline-block rounded-full bg-surface-3" style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={role ?? ""} width={size} height={size} className="opacity-80" onError={() => setErr(true)} />;
}

/** Overlapping portraits; the owner gets a coral ring (DESIGN.md avatar stack). */
export function AvatarStack({
  members,
  ownerPuuid,
  crewSlug,
  max = 8,
  size = 32,
}: {
  members: PlayerIdentity[];
  ownerPuuid?: string;
  crewSlug?: string;
  max?: number;
  size?: number;
}) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2.5">
        {shown.map((m) => {
          const owner = m.puuid === ownerPuuid;
          return (
            <PlayerLink
              key={m.puuid}
              riotId={m.riotId}
              tag={m.tag}
              region={m.region}
              crewSlug={crewSlug}
              className="relative rounded-full transition-transform duration-150 hover:z-10 hover:-translate-y-0.5"
            >
              <span className={`block rounded-full ${owner ? "ring-2 ring-primary" : "ring-2 ring-bg"}`} title={`${m.riotId}${owner ? " · owner" : ""}`}>
                <ProfileIcon id={m.profileIcon} name={m.riotId} size={size} />
              </span>
            </PlayerLink>
          );
        })}
      </div>
      {extra > 0 && (
        <span className="ml-1 grid place-items-center rounded-full bg-surface-3 text-2xs font-semibold text-ink-dim ring-2 ring-bg" style={{ width: size, height: size }}>
          +{extra}
        </span>
      )}
    </div>
  );
}
