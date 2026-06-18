"use client";
import { useState } from "react";
import { ChevronDown, Crown, Swords, Skull, Trophy } from "lucide-react";
import type { ActivityItem } from "@crewstats/shared";
import { ChampIcon } from "../kit/Avatar";
import { Empty } from "../kit/Frame";
import { MatchScoreboard } from "./MatchScoreboard";
import { timeAgo, gameDuration, placementSuffix } from "@/lib/format";

const QUEUE_NAME: Record<string, string> = { ranked: "Ranked Solo", flex: "Ranked Flex", aram: "ARAM", arena: "Arena", all: "Game" };

/** Recent shared games — expand any to see the full lobby with the crew emphasised. */
export function Activity({ items, crewSlug }: { items: ActivityItem[]; crewSlug?: string }) {
  void crewSlug;
  if (!items.length) return <Empty>No shared games yet. When your stack queues together, the games land here.</Empty>;
  return (
    <ul className="space-y-1.5">
      {items.map((m) => (
        <ActivityRow key={m.matchId} m={m} />
      ))}
    </ul>
  );
}

function ActivityRow({ m }: { m: ActivityItem }) {
  const [open, setOpen] = useState(false);
  const arena = m.queueSlug === "arena";
  // Carry = the crew member flagged as the game's MVP (role-fair score, ingestion-time).
  const carrier = arena ? undefined : m.members.find((p) => p.isTeamMvp);

  // The stack's result for this game. Arena ranks placements (top 4 of 8 = a "win");
  // Summoner's Rift goes by the crew's win flag (majority, in case they split teams).
  const best = arena ? Math.min(...m.members.map((p) => p.placement ?? 9)) : 0;
  const won = arena ? best <= 4 : m.members.filter((p) => p.win).length * 2 >= m.members.length;

  const headline = arena ? placementSuffix(best).toUpperCase() : won ? "VICTORY" : "DEFEAT";
  const ResultIcon = arena ? (best === 1 ? Trophy : won ? Swords : Skull) : won ? Swords : Skull;
  const accent = arena && best === 1 ? "gold" : won ? "win" : "loss"; // theme token name

  return (
    <li
      className={`relative overflow-hidden notch notch-sm border bg-gradient-to-r to-surface-2/20 ${
        won ? "from-win/10" : "from-loss/10"
      } ${carrier ? "border-gold/40 ring-1 ring-gold/30" : won ? "border-win/25" : "border-loss/25"}`}
      style={carrier ? { boxShadow: "0 0 18px -2px oklch(var(--gold) / 0.3)" } : undefined}
    >
      {/* Result rail — a quick win/loss read when scanning the list. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `oklch(var(--${accent}))` }} />

      <button onClick={() => setOpen((o) => !o)} className="w-full py-2.5 pl-4 pr-3 text-left" aria-expanded={open}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ResultIcon className="h-4 w-4" style={{ color: `oklch(var(--${accent}))` }} aria-hidden />
            <span className="font-display text-sm font-bold tracking-wide" style={{ color: `oklch(var(--${accent}))` }}>
              {headline}
            </span>
            <span className="text-2xs font-medium text-ink-faint">· {QUEUE_NAME[m.queueSlug] ?? "Game"}</span>
            {carrier && (
              <span className="notch notch-sm flex items-center gap-1 bg-gold/15 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-gold">
                <Crown className="h-3 w-3" aria-hidden /> Carried
              </span>
            )}
          </div>
          <span className="flex items-center gap-2 text-2xs text-ink-faint tnum">
            {gameDuration(m.gameDuration)} · {timeAgo(m.gameStart)}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {m.members.map((p) => {
            const good = arena ? (p.placement ?? 9) <= 4 : p.win;
            const isCarry = p.puuid === carrier?.puuid;
            return (
              <span
                key={p.puuid}
                style={isCarry ? { boxShadow: "0 0 12px -2px oklch(var(--gold) / 0.4)" } : undefined}
                className={`notch notch-sm flex items-center gap-1.5 py-1 pl-1 pr-2.5 text-xs ${
                  isCarry ? "bg-gold/15 ring-1 ring-gold/60" : good ? "bg-win/10" : "bg-loss/10"
                }`}
              >
                <ChampIcon name={p.championName} size={20} />
                <span className={`font-medium ${isCarry ? "text-gold" : ""}`}>{p.riotId}</span>
                {isCarry && <Crown className="h-3 w-3 text-gold" aria-label="carried" />}
                <span className="font-mono text-ink-dim tnum">
                  {p.kills}/{p.deaths}/{p.assists}
                </span>
                {p.placement != null && <span className="text-ink-faint">{placementSuffix(p.placement)}</span>}
              </span>
            );
          })}
        </div>
      </button>

      {open && (
        <div className="border-t border-line/40 px-3 py-3">
          {/* No fallback lines — the stack's lines are already shown in the row header
              above, so on an unavailable lobby we just show the small note (no duplicate). */}
          <MatchScoreboard matchId={m.matchId} queueSlug={m.queueSlug} highlight={m.members.map((p) => p.puuid)} />
        </div>
      )}
    </li>
  );
}
