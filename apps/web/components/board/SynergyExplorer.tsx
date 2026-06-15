"use client";
import { useMemo, useState } from "react";
import { Users, X } from "lucide-react";
import type { PlayerIdentity, CrewLineup, QueueSlug } from "@crewstats/shared";
import { ProfileIcon } from "../kit/Avatar";
import { PlayerLink } from "../kit/links";
import { Gauge } from "../kit/Gauge";
import { SampleSize } from "../kit/Badge";
import { Empty } from "../kit/Frame";
import { pct } from "@/lib/format";

const QUEUE_OPTS: { slug: QueueSlug; label: string }[] = [
  { slug: "ranked", label: "Ranked Solo" },
  { slug: "flex", label: "Flex" },
  { slug: "aram", label: "ARAM" },
  { slug: "arena", label: "Arena" },
];

/**
 * Interactive synergy explorer. A duo wall doesn't scale to a big crew (20 people
 * = 190 pairs), so instead: pick any players and see how that exact group does
 * together — a pair, a trio, a full 5-stack — computed live from the per-side
 * lineup matrix. Pick nobody → the crew's top duos. Pick one → their best/worst
 * partners. Sample sizes always shown; nothing claimed below `minGames`.
 */
export function SynergyExplorer({
  members,
  lineups,
  minGames,
  crewSlug,
}: {
  members: PlayerIdentity[];
  lineups: CrewLineup[];
  minGames: number;
  crewSlug: string;
}) {
  const [sel, setSel] = useState<string[]>([]);
  const byId = useMemo(() => new Map(members.map((m) => [m.puuid, m])), [members]);

  // Which queues this crew actually has shared lineups in — toggle hidden if only one.
  const available = useMemo(() => {
    const present = new Set(lineups.map((l) => l.queueSlug));
    return QUEUE_OPTS.filter((o) => present.has(o.slug));
  }, [lineups]);
  const [queue, setQueue] = useState<QueueSlug>(() => available[0]?.slug ?? "ranked");
  const filtered = useMemo(() => lineups.filter((l) => l.queueSlug === queue), [lineups, queue]);

  const stats = (puuids: string[]) => {
    let games = 0,
      wins = 0;
    for (const l of filtered) {
      if (puuids.every((p) => l.puuids.includes(p))) {
        games++;
        if (l.win) wins++;
      }
    }
    return { games, wins, winrate: games ? wins / games : null };
  };

  function toggle(puuid: string) {
    setSel((s) => (s.includes(puuid) ? s.filter((p) => p !== puuid) : [...s, puuid]));
  }

  const stack = sel.length >= 2 ? stats(sel) : null;

  // For a single selected player: every partner ranked by together-winrate.
  const partners = useMemo(() => {
    if (sel.length !== 1) return [];
    const me = sel[0]!;
    return members
      .filter((m) => m.puuid !== me)
      .map((m) => ({ m, ...stats([me, m.puuid]) }))
      .filter((p) => p.games >= minGames)
      .sort((a, b) => (b.winrate ?? 0) - (a.winrate ?? 0) || b.games - a.games);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, members, filtered, minGames]);

  return (
    <div className="space-y-4">
      {/* Queue toggle — see synergy within each mode */}
      {available.length > 1 && (
        <div className="notch notch-sm inline-flex gap-0.5 border border-line bg-bg/60 p-0.5">
          {available.map((o) => {
            const on = o.slug === queue;
            return (
              <button
                key={o.slug}
                type="button"
                onClick={() => setQueue(o.slug)}
                aria-current={on ? "page" : undefined}
                className={`notch notch-sm px-3 py-1 text-xs font-medium transition-colors ${
                  on ? "bg-surface-3 text-ink shadow-[inset_0_-2px_0_oklch(var(--primary)/0.7)]" : "text-ink-dim hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Roster — toggle players into the selection */}
      <div className="flex flex-wrap items-center gap-2">
        {members.map((m) => {
          const on = sel.includes(m.puuid);
          return (
            <button
              key={m.puuid}
              onClick={() => toggle(m.puuid)}
              aria-pressed={on}
              className={`notch notch-sm flex items-center gap-1.5 border py-1 pl-1 pr-2.5 text-sm transition-colors ${
                on ? "border-primary/60 bg-primary/15 text-ink" : "border-line/60 bg-surface-2/40 text-ink-dim hover:text-ink"
              }`}
            >
              <ProfileIcon id={m.profileIcon} name={m.riotId} size={22} />
              <span className="font-medium">{m.riotId}</span>
            </button>
          );
        })}
        {sel.length > 0 && (
          <button onClick={() => setSel([])} className="ml-1 inline-flex items-center gap-1 text-2xs text-ink-faint transition-colors hover:text-ink">
            <X className="h-3 w-3" /> clear
          </button>
        )}
      </div>

      {/* Result */}
      {sel.length >= 2 ? (
        <Stack ids={sel.map((p) => byId.get(p)).filter(Boolean) as PlayerIdentity[]} games={stack!.games} wins={stack!.wins} winrate={stack!.winrate} minGames={minGames} />
      ) : sel.length === 1 ? (
        <Partners me={byId.get(sel[0]!)!} partners={partners} minGames={minGames} crewSlug={crewSlug} />
      ) : (
        <TopSynergies lineups={filtered} members={members} minGames={minGames} crewSlug={crewSlug} />
      )}
    </div>
  );
}

function Stack({
  ids,
  games,
  wins,
  winrate,
  minGames,
}: {
  ids: PlayerIdentity[];
  games: number;
  wins: number;
  winrate: number | null;
  minGames: number;
}) {
  const enough = games >= minGames;
  return (
    <div className="notch border border-line/60 bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {ids.map((m) => (
              <span key={m.puuid} className="rounded-full ring-2 ring-bg" title={m.riotId}>
                <ProfileIcon id={m.profileIcon} name={m.riotId} size={32} />
              </span>
            ))}
          </div>
          <div className="text-sm">
            <div className="flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] text-ink-faint">
              <Users className="h-3.5 w-3.5" /> {ids.length}-stack together
            </div>
            <div className="mt-0.5 font-medium text-ink-dim">{ids.map((m) => m.riotId).join(" · ")}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-bold tnum">{enough ? pct(winrate) : "—"}</div>
          <div className="font-mono text-2xs text-ink-faint tnum">
            {wins}–{games - wins} · <SampleSize games={games} />
          </div>
        </div>
      </div>
      <div className="mt-3">
        {enough ? (
          <Gauge value={winrate} />
        ) : (
          <p className="text-sm text-ink-faint">
            Only {games} {games === 1 ? "game" : "games"} as this exact group — not enough to call it yet (need {minGames}+).
          </p>
        )}
      </div>
    </div>
  );
}

function Partners({
  me,
  partners,
  minGames,
  crewSlug,
}: {
  me: PlayerIdentity;
  partners: { m: PlayerIdentity; games: number; wins: number; winrate: number | null }[];
  minGames: number;
  crewSlug: string;
}) {
  if (!partners.length)
    return <Empty>{me.riotId} has no partners with {minGames}+ shared games yet.</Empty>;
  const best = partners[0]!;
  const worst = partners[partners.length - 1]!;
  return (
    <div className="space-y-2.5">
      <p className="text-sm text-ink-dim">
        <span className="font-semibold text-ink">{me.riotId}</span> wins most with{" "}
        <span className="font-semibold text-ink">{best.m.riotId}</span>
        {partners.length > 1 && (
          <>
            , least with <span className="font-semibold text-ink">{worst.m.riotId}</span>
          </>
        )}
        .
      </p>
      <ul className="space-y-1.5">
        {partners.map((p) => {
          return (
            <li key={p.m.puuid} className="notch notch-sm flex items-center gap-3 border border-line/60 bg-surface-2/40 px-3 py-2">
              <ProfileIcon id={p.m.profileIcon} name={p.m.riotId} size={24} />
              <PlayerLink riotId={p.m.riotId} tag={p.m.tag} region={p.m.region} crewSlug={crewSlug} className="min-w-0 flex-1 truncate text-sm font-medium" />
              <span className="hidden w-28 sm:block">
                <Gauge value={p.winrate} tone="auto" />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-sm tnum">{pct(p.winrate)}</span>
              <SampleSize games={p.games} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Best & worst crew "teams" of any size (2–5), aggregated from the exact lineups that
 * queued a side together — not just pairs. */
function TopSynergies({
  lineups,
  members,
  minGames,
  crewSlug,
}: {
  lineups: CrewLineup[];
  members: PlayerIdentity[];
  minGames: number;
  crewSlug: string;
}) {
  const byId = useMemo(() => new Map(members.map((m) => [m.puuid, m])), [members]);
  const teams = useMemo(() => {
    // Candidate groups = the distinct lineups that actually queued together (size 2–5).
    const cand = new Map<string, string[]>();
    for (const l of lineups) {
      if (l.puuids.length < 2 || l.puuids.length > 5) continue;
      const sorted = [...l.puuids].sort();
      cand.set(sorted.join(","), sorted);
    }
    // Score each group the same way the explorer does: every game where the whole group
    // was in the lobby together (a "subset" match), not just games where they were the
    // ONLY crew members — so the numbers here match what you get clicking those players.
    const score = (group: string[]) => {
      let games = 0,
        wins = 0;
      for (const l of lineups) {
        if (group.every((p) => l.puuids.includes(p))) {
          games++;
          if (l.win) wins++;
        }
      }
      return { games, wins };
    };
    let list = [...cand.values()]
      .map((g) => {
        const { games, wins } = score(g);
        return { puuids: g, key: g.join(","), games, wins, winrate: games ? wins / games : 0 };
      })
      .filter((t) => t.games >= minGames);
    // Drop a group if a strictly larger group always plays with it (same game count) —
    // that smaller group adds nothing distinct, keep the real (bigger) team.
    list = list.filter(
      (t) =>
        !list.some(
          (o) => o !== t && o.puuids.length > t.puuids.length && o.games === t.games && t.puuids.every((p) => o.puuids.includes(p)),
        ),
    );
    return list;
  }, [lineups, minGames]);

  if (!teams.length)
    return <Empty>No teams with {minGames}+ shared games yet. Pick players above to explore any group.</Empty>;

  const best = [...teams].sort((a, b) => b.winrate - a.winrate || b.games - a.games).slice(0, 3);
  const bestKeys = new Set(best.map((t) => t.key));
  const worst = [...teams]
    .filter((t) => !bestKeys.has(t.key))
    .sort((a, b) => a.winrate - b.winrate || b.games - a.games)
    .slice(0, 3);

  const row = (t: (typeof teams)[number], tone: "gold" | "auto") => {
    const ids = t.puuids.map((p) => byId.get(p)).filter(Boolean) as PlayerIdentity[];
    return (
      <li key={t.key} className="notch notch-sm flex items-center gap-3 border border-line/60 bg-surface-2/40 px-3 py-2">
        <div className="flex -space-x-1.5">
          {ids.map((m) => (
            <span key={m.puuid} className="rounded-full ring-2 ring-bg" title={m.riotId}>
              <ProfileIcon id={m.profileIcon} name={m.riotId} size={24} />
            </span>
          ))}
        </div>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 text-sm font-medium">
          {ids.map((m, i) => (
            <span key={m.puuid} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-ink-faint">+</span>}
              <PlayerLink riotId={m.riotId} tag={m.tag} region={m.region} crewSlug={crewSlug} />
            </span>
          ))}
        </span>
        <span className="hidden w-28 shrink-0 sm:block">
          <Gauge value={t.winrate} tone={tone} />
        </span>
        <span className="w-10 shrink-0 text-right font-mono text-sm tnum">{pct(t.winrate)}</span>
        <SampleSize games={t.games} />
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-2xs uppercase tracking-[0.12em] text-ink-faint">Best synergies · any team of 2–5</p>
        <ul className="space-y-1.5">{best.map((t) => row(t, "gold"))}</ul>
      </div>
      {worst.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-2xs uppercase tracking-[0.12em] text-loss/80">Worst synergies</p>
          <ul className="space-y-1.5">{worst.map((t) => row(t, "auto"))}</ul>
        </div>
      )}
      <p className="text-2xs text-ink-faint">tap players above to explore any group</p>
    </div>
  );
}
