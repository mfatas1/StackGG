"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, ArrowUpRight } from "lucide-react";
import { ChampIcon } from "../kit/Avatar";
import { PlayerLink } from "../kit/links";
import { placementSuffix } from "@/lib/format";
import { mvpOf, type CarryStats } from "@/lib/carry";

/** Link to the standalone in-depth game page — shown under every inline scoreboard. */
function FullGameLink({ matchId }: { matchId: string }) {
  return (
    <div className="mt-2 flex justify-end">
      <Link
        href={`/match/${encodeURIComponent(matchId)}`}
        className="inline-flex items-center gap-1 text-2xs font-medium text-ink-faint transition-colors hover:text-primary"
      >
        View full game <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

interface ScorePlayer extends CarryStats {
  puuid: string;
  riotId: string;
  tag: string;
  championName: string;
  role: string | null;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  gold: number;
  cs: number;
  win: boolean;
  teamId: number;
  subteamId: number | null;
  placement: number | null;
}
interface MatchData {
  matchId: string;
  region: string;
  queueId: number;
  gameDuration: number;
  players: ScorePlayer[];
}

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

/**
 * The full game lobby — all players, not just the crew (fetched on demand from
 * Riot, since we only persist tracked members). Premades are emphasized; the page
 * player most of all; each team's MVP gets a crown. Falls back to `fallback`
 * (the crew-only lines) if the live match can't be loaded.
 */
export function MatchScoreboard({
  matchId,
  queueSlug,
  highlight,
  me,
  fallback,
}: {
  matchId: string;
  queueSlug: string;
  highlight: string[];
  me?: string;
  fallback?: React.ReactNode;
}) {
  const [state, setState] = useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = useState<MatchData | null>(null);
  const hi = new Set(highlight);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/match/${matchId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MatchData) => {
        if (cancelled) return;
        setData(d);
        setState("ok");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (state === "loading")
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton notch notch-sm h-7" />
        ))}
      </div>
    );

  if (state === "error" || !data) {
    return (
      <div>
        {fallback}
        <p className="mt-2 text-2xs text-ink-faint">Full lobby unavailable right now — showing your stack&apos;s lines.</p>
      </div>
    );
  }

  const maxDmg = Math.max(1, ...data.players.map((p) => p.damage));

  // Arena: group by subteam, ordered by placement.
  if (queueSlug === "arena") {
    const subteams = [...new Set(data.players.map((p) => p.subteamId))].sort((a, b) => {
      const pa = data.players.find((p) => p.subteamId === a)?.placement ?? 9;
      const pb = data.players.find((p) => p.subteamId === b)?.placement ?? 9;
      return pa - pb;
    });
    return (
      <div>
        <div className="grid gap-2 sm:grid-cols-2">
          {subteams.map((st) => {
            const team = data.players.filter((p) => p.subteamId === st);
            const place = team[0]?.placement ?? null;
            return (
              <div key={st ?? "?"} className="notch notch-sm border border-line/50 p-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {place != null ? placementSuffix(place) : "—"}
                </div>
                {team.map((p) => (
                  <Row key={p.puuid} p={p} maxDmg={maxDmg} premade={hi.has(p.puuid)} isMe={p.puuid === me} mvp={false} region={data.region} />
                ))}
              </div>
            );
          })}
        </div>
        <FullGameLink matchId={matchId} />
      </div>
    );
  }

  // SR / ARAM: two teams.
  const teams = [100, 200].map((tid) => {
    const roster = data.players.filter((p) => p.teamId === tid);
    return { tid, roster, win: roster[0]?.win ?? false, mvpPuuid: mvpOf(roster)?.puuid };
  });

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {teams.map((t) => (
          <div key={t.tid} className="notch notch-sm border border-line/50 p-2">
            <div className={`mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] ${t.win ? "text-win" : "text-loss"}`}>
              <span>{t.tid === 100 ? "Blue team" : "Red team"}</span>
              <span>{t.win ? "Victory" : "Defeat"}</span>
            </div>
            <div className="space-y-0.5">
              {t.roster.map((p) => (
                <Row key={p.puuid} p={p} maxDmg={maxDmg} premade={hi.has(p.puuid)} isMe={p.puuid === me} mvp={p.puuid === t.mvpPuuid} region={data.region} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <FullGameLink matchId={matchId} />
    </div>
  );
}

function Row({ p, maxDmg, premade, isMe, mvp, region }: { p: ScorePlayer; maxDmg: number; premade: boolean; isMe: boolean; mvp: boolean; region: string }) {
  const nameCls = `min-w-0 flex-1 truncate ${premade || isMe ? "font-semibold text-ink" : "text-ink-dim"}`;
  const linkable = !isMe && p.riotId !== "Player" && p.tag.length > 0;
  return (
    <div
      className={`flex items-center gap-2 px-1.5 py-1 text-xs ${
        isMe ? "notch notch-sm bg-primary/20 ring-1 ring-primary/50" : premade ? "notch notch-sm bg-primary/10" : ""
      }`}
    >
      <ChampIcon name={p.championName} size={20} />
      {isMe ? (
        <span className={nameCls}>You</span>
      ) : linkable ? (
        <PlayerLink riotId={p.riotId} tag={p.tag} region={region} className={nameCls}>
          {p.riotId}
        </PlayerLink>
      ) : (
        <span className={nameCls}>{p.riotId}</span>
      )}
      {mvp && <Crown className="h-3 w-3 shrink-0 text-gold" aria-label="Team MVP" />}
      <span className="shrink-0 font-mono text-ink-dim tnum">
        {p.kills}/{p.deaths}/{p.assists}
      </span>
      <span className="hidden w-14 shrink-0 items-center gap-1 sm:flex" title={`${p.damage.toLocaleString()} damage`}>
        <span className="h-1 flex-1 overflow-hidden rounded-pill bg-surface-3">
          <span className={`block h-full ${premade || isMe ? "bg-primary" : "bg-ink-faint/50"}`} style={{ width: `${(p.damage / maxDmg) * 100}%` }} />
        </span>
      </span>
      <span className="hidden w-9 shrink-0 text-right font-mono text-2xs text-ink-faint tnum sm:block">{short(p.damage)}</span>
    </div>
  );
}
