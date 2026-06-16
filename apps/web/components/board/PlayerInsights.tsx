import { TrendingUp, TrendingDown, Activity, Crown } from "lucide-react";
import type { PlayerInsight } from "@crewstats/stats";
import { Frame, PanelHead } from "../kit/Frame";
import { ChampIcon, RoleIcon } from "../kit/Avatar";

const TONE: Record<PlayerInsight["tone"], string> = { good: "text-win", bad: "text-loss", neutral: "text-ink" };

/** "Edge" — scouting-style insight cards from a player's ranked history (any profile). */
export function PlayerInsights({ insights, self = false }: { insights: PlayerInsight[]; self?: boolean }) {
  if (!insights.length) return null;
  return (
    <Frame>
      <PanelHead title={self ? "Your edge" : "Edge"} />
      <ul className="grid gap-2 p-4 pt-3 sm:grid-cols-2">
        {insights.map((i, idx) => (
          <li key={idx} className="notch notch-sm flex items-start gap-3 border border-line/60 bg-surface-2/40 px-3 py-2.5">
            <span className="mt-0.5 shrink-0">
              {i.championName ? (
                <ChampIcon name={i.championName} size={28} />
              ) : i.role ? (
                <span className="grid h-7 w-7 place-items-center rounded bg-bg/50">
                  <RoleIcon role={i.role} size={18} />
                </span>
              ) : i.kind === "carryRate" ? (
                <span className="grid h-7 w-7 place-items-center rounded bg-bg/50 text-gold">
                  <Crown className="h-4 w-4" />
                </span>
              ) : (
                <span className={`grid h-7 w-7 place-items-center rounded bg-bg/50 ${TONE[i.tone]}`}>
                  {i.tone === "good" ? <TrendingUp className="h-4 w-4" /> : i.tone === "bad" ? <TrendingDown className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${TONE[i.tone]}`}>{i.headline}</div>
              <div className="text-2xs text-ink-faint">{i.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
