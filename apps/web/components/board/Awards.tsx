"use client";
import { useState } from "react";
import Link from "next/link";
import { Trophy, ChevronDown, ArrowUpRight } from "lucide-react";
import type { Award } from "@crewstats/shared";
import type { RolePlacement } from "@crewstats/shared";
import { ProfileIcon, RoleIcon } from "../kit/Avatar";
import { Empty } from "../kit/Frame";
import { PlayerLink } from "../kit/links";
import { pct } from "@/lib/format";

/**
 * The grey context line under a record ("Draven · 21/4/8 · Ranked Flex"). For per-game
 * records it links to the full in-depth game page; all-time aggregates (no single source
 * game) render as plain text.
 */
function SubLine({ sub, matchId }: { sub: string; matchId?: string }) {
  if (!matchId) return <div className="truncate text-2xs text-ink-faint">{sub}</div>;
  return (
    <Link
      href={`/match/${encodeURIComponent(matchId)}`}
      className="group flex max-w-full items-center gap-1 text-2xs text-ink-faint transition-colors hover:text-primary"
      title="Open the full game"
    >
      <span className="truncate underline decoration-dotted decoration-line/70 underline-offset-2 group-hover:decoration-primary/60">{sub}</span>
      <ArrowUpRight className="h-3 w-3 shrink-0" />
    </Link>
  );
}

function AwardRow({ a, crewSlug, defaultOpen, className = "" }: { a: Award; crewSlug: string; defaultOpen?: boolean; className?: string }) {
  const rest = a.ranking.slice(1, 5); // display ranks 2–5 only (full ranking still drives the average)
  const canExpand = rest.length > 0;
  const [open, setOpen] = useState(!!defaultOpen && canExpand);
  return (
    <li className={`notch notch-sm border border-line/60 bg-surface-2/40 ${className}`}>
      <div className="flex w-full items-center gap-3 p-3">
        <span className="notch notch-sm grid h-9 w-9 shrink-0 place-items-center bg-gold/15 text-gold">
          <Trophy className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-2xs uppercase tracking-[0.12em] text-ink-faint">{a.label}</div>
          <div className="flex items-center gap-1.5">
            <ProfileIcon id={a.holder.profileIcon} name={a.holder.riotId} size={18} />
            <PlayerLink riotId={a.holder.riotId} tag={a.holder.tag} region={a.holder.region} crewSlug={crewSlug} className="truncate text-sm font-semibold" />
          </div>
          <SubLine sub={a.sub} matchId={a.matchId} />
        </div>
        <span className="shrink-0 font-display text-2xl font-bold tnum text-gold">{a.value}</span>
        {canExpand && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 rounded p-1 text-ink-faint transition-colors hover:text-ink"
            aria-expanded={open}
            aria-label="Show top 5"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && canExpand && (
        <ol className="space-y-0.5 border-t border-line/50 px-3 py-2">
          {rest.map((e) => (
            <li key={e.rank} className="flex items-center gap-2.5 py-1.5">
              <span className="w-4 shrink-0 text-center font-mono text-xs text-ink-faint tnum">{e.rank}</span>
              <ProfileIcon id={e.holder.profileIcon} name={e.holder.riotId} size={16} />
              <div className="min-w-0 flex-1">
                <PlayerLink riotId={e.holder.riotId} tag={e.holder.tag} region={e.holder.region} crewSlug={crewSlug} className="truncate text-xs font-medium" />
                <SubLine sub={e.sub} matchId={e.matchId} />
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold tnum text-ink-dim">{e.value}</span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

export function Awards({
  awards,
  crewSlug,
  limit,
  defaultOpen,
}: {
  awards: Award[];
  crewSlug: string;
  limit?: number;
  defaultOpen?: boolean;
}) {
  if (!awards.length) return <Empty>Records appear once the stack has a few games logged.</Empty>;
  const shown = limit ? awards.slice(0, limit) : awards;
  return (
    <ul className="space-y-2">
      {shown.map((a) => (
        <AwardRow key={a.key} a={a} crewSlug={crewSlug} defaultOpen={defaultOpen} />
      ))}
    </ul>
  );
}

/** The crew, fielded by lane — a "team sheet" read of who plays where. */
export function Lineup({ placements, crewSlug }: { placements: RolePlacement[]; crewSlug: string }) {
  const ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
  const byRole = new Map<string, RolePlacement[]>();
  for (const p of placements) {
    const r = p.role.toUpperCase();
    if (!ORDER.includes(r)) continue;
    (byRole.get(r) ?? byRole.set(r, []).get(r)!).push(p);
  }
  if (!placements.length) return <Empty>Play ranked or flex and the stack fills out the lanes here.</Empty>;
  return (
    <ul className="space-y-2">
      {ORDER.map((role) => {
        const members = byRole.get(role) ?? [];
        return (
          <li key={role} className="flex items-center gap-3">
            <span className="flex w-24 shrink-0 items-center gap-2 text-2xs uppercase tracking-[0.1em] text-ink-faint">
              <RoleIcon role={role} size={16} /> {role === "UTILITY" ? "Support" : role.toLowerCase()}
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {members.length === 0 ? (
                <span className="text-2xs text-ink-faint">—</span>
              ) : (
                members.map((m) => {
                  const good = (m.winrate ?? 0) >= 0.5;
                  return (
                    <PlayerLink key={m.identity.puuid} riotId={m.identity.riotId} tag={m.identity.tag} region={m.identity.region} crewSlug={crewSlug} className="notch notch-sm flex items-center gap-1.5 border border-line/60 bg-surface-2/40 py-1 pl-1 pr-2.5 text-xs">
                      <ProfileIcon id={m.identity.profileIcon} name={m.identity.riotId} size={20} />
                      <span className="font-medium">{m.identity.riotId}</span>
                      <span className={`font-mono tnum ${good ? "text-win" : "text-loss"}`}>{pct(m.winrate)}</span>
                    </PlayerLink>
                  );
                })
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
