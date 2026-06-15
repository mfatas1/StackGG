"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Crown, Filter } from "lucide-react";
import type { MatchHistoryItem, MatchCrewmate } from "@crewstats/shared";
import { ChampIcon, RoleIcon } from "../kit/Avatar";
import { Empty } from "../kit/Frame";
import { PlayerLink } from "../kit/links";
import { MatchScoreboard } from "./MatchScoreboard";
import { timeAgo, gameDuration, placementSuffix } from "@/lib/format";
import { mvpOf } from "@/lib/carry";

const kdaRatio = (k: number, d: number, a: number) => (d === 0 ? Infinity : (k + a) / d);
const kdaText = (k: number, d: number, a: number) => (d === 0 ? "Perfect" : ((k + a) / d).toFixed(2));
const kdaTone = (r: number) => (r >= 4 ? "text-gold" : r >= 2.5 ? "text-win" : r >= 1.5 ? "text-ink" : "text-loss");
const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const QUEUE_NAME: Record<string, string> = { ranked: "Ranked Solo", flex: "Ranked Flex", aram: "ARAM", arena: "Arena", all: "Game" };

/** Performance grade from KDA — honest, KDA-based (no fake OP score). */
function grade(k: number, d: number, a: number): { label: string; cls: string } | null {
  const r = kdaRatio(k, d, a);
  if (d === 0 && k + a >= 5) return { label: "Flawless", cls: "bg-gold/15 text-gold" };
  if (r >= 5) return { label: "Hard carry", cls: "bg-gold/15 text-gold" };
  if (r >= 3) return { label: "Carried", cls: "bg-win/12 text-win" };
  if (r < 1 && d >= 7) return { label: "Fed", cls: "bg-loss/12 text-loss" };
  return null;
}

export function MatchList({
  items,
  basePath,
  crewSlug,
  mePuuid,
}: {
  items: MatchHistoryItem[];
  basePath: string;
  crewSlug?: string;
  mePuuid?: string;
}) {
  if (!items.length) return <Empty>No games found for this filter.</Empty>;
  return (
    <ul className="space-y-1.5">
      {items.map((m) => (
        <MatchRow key={m.matchId} m={m} basePath={basePath} crewSlug={crewSlug} mePuuid={mePuuid} />
      ))}
    </ul>
  );
}

function MatchRow({ m, basePath, crewSlug, mePuuid }: { m: MatchHistoryItem; basePath: string; crewSlug?: string; mePuuid?: string }) {
  const [open, setOpen] = useState(false);
  const arena = m.queueSlug === "arena";
  // A game under 5 min is a remake (early void) — neither a win nor a loss, like op.gg.
  const remake = m.gameDuration > 0 && m.gameDuration < 300;
  const good = arena ? (m.placement ?? 9) <= 4 : m.win;
  const ratio = kdaRatio(m.kills, m.deaths, m.assists);
  const csPerMin = m.gameDuration > 0 ? (m.cs / (m.gameDuration / 60)).toFixed(1) : "0";

  // Who carried (same side only): the page player vs. same-side crewmates.
  const me = { kills: m.kills, deaths: m.deaths, assists: m.assists, damage: m.damage, riotId: "You" };
  const sameSide = m.crewmates.filter((c) => c.sameSide);
  const enemySide = m.crewmates.filter((c) => !c.sameSide);
  const carrierKey = mvpOf([me, ...sameSide])?.riotId ?? me.riotId;
  const g = grade(m.kills, m.deaths, m.assists);

  return (
    <li className={`notch notch-sm border-l-2 bg-surface-2/40 ${remake ? "border-l-line" : good ? "border-l-win" : "border-l-loss"}`}>
      {/* Collapsed row — click to expand */}
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 py-2 pl-3 pr-3 text-left" aria-expanded={open}>
        <span className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <Link href={`${basePath}?champ=${m.championId}`} aria-label={`Filter to ${m.championName}`}>
            <ChampIcon name={m.championName} size={38} />
          </Link>
          {m.role && (
            <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-bg ring-1 ring-line">
              <RoleIcon role={m.role} size={10} />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate font-medium">{m.championName}</span>
            <span className={`text-2xs font-semibold ${remake ? "text-ink-faint" : good ? "text-win" : "text-loss"}`}>
              {remake ? "Remake" : arena ? placementSuffix(m.placement ?? 0) : m.win ? "Win" : "Loss"}
            </span>
            {!remake && m.isTeamMvp && !arena && <Crown className="h-3.5 w-3.5 text-gold" aria-label="Team MVP — highest carry score on your team" />}
          </div>
          <div className="mt-0.5 text-2xs text-ink-faint">
            {QUEUE_NAME[m.queueSlug] ?? "Game"} · {gameDuration(m.gameDuration)} · {timeAgo(m.gameStart)}
          </div>
        </div>

        {/* crew mini icons */}
        {m.crewmates.length > 0 && (
          <div className="hidden -space-x-1.5 sm:flex">
            {m.crewmates.slice(0, 4).map((c) => (
              <span key={c.puuid} className={`rounded-sm ring-1 ${c.sameSide ? "ring-win/50" : "ring-loss/50"}`} title={`${c.riotId} · ${c.championName}`}>
                <ChampIcon name={c.championName} size={18} />
              </span>
            ))}
          </div>
        )}

        {g && <span className={`hidden shrink-0 px-1.5 py-0.5 text-[10px] font-semibold sm:inline-block ${g.cls}`}>{g.label}</span>}

        <div className="shrink-0 text-right">
          <div className={`font-mono text-sm font-semibold tnum ${kdaTone(ratio)}`}>{kdaText(m.kills, m.deaths, m.assists)}</div>
          <div className="font-mono text-2xs text-ink-faint tnum">
            {m.kills}/{m.deaths}/{m.assists}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-line/40 px-3 py-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Stat label="KDA" value={kdaText(m.kills, m.deaths, m.assists)} tone={kdaTone(ratio)} />
            <Stat label="K / D / A" value={`${m.kills}/${m.deaths}/${m.assists}`} />
            <Stat label="CS" value={`${m.cs}`} sub={`${csPerMin}/min`} />
            <Stat label="Damage" value={short(m.damage)} />
            <Stat label="Gold" value={short(m.gold)} />
            <Stat label={arena ? "Place" : "Vision"} value={arena ? placementSuffix(m.placement ?? 0) : `${m.visionScore}`} />
          </div>

          <div className="mt-3">
            <MatchScoreboard
              matchId={m.matchId}
              queueSlug={m.queueSlug}
              me={mePuuid}
              highlight={[mePuuid, ...m.crewmates.map((c) => c.puuid)].filter(Boolean) as string[]}
              fallback={
                m.crewmates.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SideList title="Your side" rows={sameSide} me={{ ...me, championName: m.championName }} carrierKey={carrierKey} crewSlug={crewSlug} />
                    {enemySide.length > 0 && <SideList title="Enemy side" rows={enemySide} crewSlug={crewSlug} />}
                  </div>
                ) : null
              }
            />
          </div>

          <Link
            href={`${basePath}?champ=${m.championId}`}
            className="mt-3 inline-flex items-center gap-1.5 text-2xs text-ink-faint transition-colors hover:text-ink"
          >
            <Filter className="h-3 w-3" /> Only {m.championName}
          </Link>
        </div>
      )}
    </li>
  );
}

function Stat({ label, value, sub, tone = "text-ink" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="notch notch-sm bg-bg/40 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`font-mono text-sm font-semibold tnum ${tone}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-ink-faint tnum">{sub}</div>}
    </div>
  );
}

function SideList({
  title,
  rows,
  me,
  carrierKey,
  crewSlug,
}: {
  title: string;
  rows: MatchCrewmate[];
  me?: { riotId: string; championName: string; kills: number; deaths: number; assists: number; damage: number };
  carrierKey?: string;
  crewSlug?: string;
}) {
  const lines = [
    ...(me ? [{ ...me, isMe: true as const, puuid: "me", tag: "", region: "" }] : []),
    ...rows.map((r) => ({ ...r, isMe: false as const })),
  ];
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{title}</div>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l.puuid} className="flex items-center gap-2 text-xs">
            <ChampIcon name={l.championName} size={20} />
            {l.isMe ? (
              <span className="min-w-0 flex-1 truncate font-medium">You</span>
            ) : crewSlug ? (
              <PlayerLink riotId={l.riotId} tag={l.tag} region={l.region} crewSlug={crewSlug} className="min-w-0 flex-1 truncate font-medium" />
            ) : (
              <span className="min-w-0 flex-1 truncate font-medium">{l.riotId}</span>
            )}
            {carrierKey && carrierKey === (l.isMe ? "You" : l.riotId) && <Crown className="h-3 w-3 shrink-0 text-gold" aria-label="carried" />}
            <span className="shrink-0 font-mono text-ink-dim tnum">
              {l.kills}/{l.deaths}/{l.assists}
            </span>
            <span className="hidden shrink-0 font-mono text-2xs text-ink-faint tnum sm:inline">{short(l.damage)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
