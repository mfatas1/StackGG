"use client";
import { useState } from "react";
import { ChevronDown, Crown } from "lucide-react";
import type { ActivityItem } from "@crewstats/shared";
import { ChampIcon } from "../kit/Avatar";
import { Empty } from "../kit/Frame";
import { MatchScoreboard } from "./MatchScoreboard";
import { timeAgo, gameDuration, placementSuffix } from "@/lib/format";

const QUEUE_NAME: Record<string, string> = { ranked: "Ranked Solo", flex: "Ranked Flex", aram: "ARAM", arena: "Arena", all: "Game" };
const carry = (m: { kills: number; assists: number; deaths: number }) => (m.kills * 2 + m.assists) / Math.max(1, m.deaths);

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
  const carrierPuuid = m.members.reduce((best, p) => (carry(p) > carry(best) ? p : best), m.members[0]!)?.puuid;

  return (
    <li className="notch notch-sm border border-line/50 bg-surface-2/40">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-3 py-2.5 text-left" aria-expanded={open}>
        <div className="mb-2 flex items-center justify-between text-2xs text-ink-faint">
          <span className="font-medium text-ink-dim">{QUEUE_NAME[m.queueSlug] ?? "Game"}</span>
          <span className="flex items-center gap-2 tnum">
            {gameDuration(m.gameDuration)} · {timeAgo(m.gameStart)}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {m.members.map((p) => {
            const good = arena ? (p.placement ?? 9) <= 4 : p.win;
            return (
              <span key={p.puuid} className={`notch notch-sm flex items-center gap-1.5 py-1 pl-1 pr-2.5 text-xs ${good ? "bg-win/10" : "bg-loss/10"}`}>
                <ChampIcon name={p.championName} size={20} />
                <span className="font-medium">{p.riotId}</span>
                {p.puuid === carrierPuuid && !arena && <Crown className="h-3 w-3 text-gold" aria-label="carried" />}
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
          <MatchScoreboard
            matchId={m.matchId}
            queueSlug={m.queueSlug}
            highlight={m.members.map((p) => p.puuid)}
            fallback={
              <div className="flex flex-wrap gap-1.5">
                {m.members.map((p) => (
                  <span key={p.puuid} className="notch notch-sm flex items-center gap-1.5 bg-surface-2/60 py-1 pl-1 pr-2.5 text-xs">
                    <ChampIcon name={p.championName} size={18} />
                    <span className="font-medium">{p.riotId}</span>
                    <span className="font-mono text-ink-dim tnum">
                      {p.kills}/{p.deaths}/{p.assists}
                    </span>
                  </span>
                ))}
              </div>
            }
          />
        </div>
      )}
    </li>
  );
}
