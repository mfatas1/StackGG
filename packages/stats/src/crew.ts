import { query, queryOne, type Queryable } from "@crewstats/shared";
import type {
  LeaderboardEntry,
  CrewCards,
  CrewDashboard,
  CrewSummary,
  PlayerIdentity,
  QueueSlug,
  RankInfo,
} from "@crewstats/shared";
import { QUEUES } from "@crewstats/shared";
import { winrate, round, queueIdsForSlug, NOT_REMAKE_SQL } from "./util.js";
import { getIdentity, getRecentForm } from "./modes.js";
import { getDuoSynergies, getFlexRoles, getCrewLineups } from "./synergy.js";
import { getActivity } from "./activity.js";

export async function getCrewMemberPuuids(client: Queryable, crewId: string): Promise<string[]> {
  const rows = await query<{ puuid: string }>(
    `SELECT puuid FROM crew_members WHERE crew_id = $1 ORDER BY joined_at ASC`,
    [crewId],
    client,
  );
  return rows.map((r) => r.puuid);
}

export async function getCrewSummary(client: Queryable, crewId: string): Promise<CrewSummary | null> {
  const r = await queryOne<{
    id: string;
    slug: string;
    name: string;
    invite_code: string;
    member_count: string;
  }>(
    `SELECT c.id, c.slug, c.name, c.invite_code,
       (SELECT count(*) FROM crew_members cm WHERE cm.crew_id = c.id)::text AS member_count
     FROM crews c WHERE c.id = $1`,
    [crewId],
    client,
  );
  if (!r) return null;
  return { id: r.id, slug: r.slug, name: r.name, inviteCode: r.invite_code, memberCount: Number(r.member_count) };
}

export async function getCrewSummaryBySlug(client: Queryable, slug: string): Promise<CrewSummary | null> {
  const r = await queryOne<{ id: string }>(`SELECT id FROM crews WHERE slug = $1`, [slug], client);
  return r ? getCrewSummary(client, r.id) : null;
}

interface MemberAggRow {
  puuid: string;
  games: string;
  wins: string;
  games7d: string;
  wins7d: string;
  avg_placement: string | null;
  rank_solo: RankInfo | null;
  rank_flex: RankInfo | null;
}

/** Crew leaderboard for a queue filter (PLAN §5.4). */
export async function getLeaderboard(
  client: Queryable,
  puuids: string[],
  slug: QueueSlug,
): Promise<LeaderboardEntry[]> {
  if (puuids.length === 0) return [];
  const queueIds = queueIdsForSlug(slug);
  const params: unknown[] = [puuids];
  const queueClause = queueIds ? `AND m.queue_id = ANY($2::int[])` : "";
  if (queueIds) params.push(queueIds);

  const rows = await query<MemberAggRow>(
    `SELECT ra.puuid,
       COALESCE(agg.games,0)::text AS games,
       COALESCE(agg.wins,0)::text AS wins,
       COALESCE(agg.games7d,0)::text AS games7d,
       COALESCE(agg.wins7d,0)::text AS wins7d,
       agg.avg_placement::text AS avg_placement,
       ra.rank_solo, ra.rank_flex
     FROM riot_accounts ra
     LEFT JOIN (
       SELECT mp.puuid,
         count(*) AS games,
         count(*) FILTER (WHERE mp.win) AS wins,
         count(*) FILTER (WHERE m.game_start > now() - interval '7 days') AS games7d,
         count(*) FILTER (WHERE mp.win AND m.game_start > now() - interval '7 days') AS wins7d,
         avg(mp.placement) FILTER (WHERE m.queue_id = ${QUEUES.ARENA}) AS avg_placement
       FROM match_participants mp
       JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1) AND ${NOT_REMAKE_SQL} ${queueClause}
       GROUP BY mp.puuid
     ) agg ON agg.puuid = ra.puuid
     WHERE ra.puuid = ANY($1)`,
    params,
    client,
  );

  // Pooled crew winrate baseline for vs-crew-average.
  let crewWins = 0;
  let crewGames = 0;
  for (const r of rows) {
    crewWins += Number(r.wins);
    crewGames += Number(r.games);
  }
  const crewWr = crewGames > 0 ? crewWins / crewGames : null;

  const entries: LeaderboardEntry[] = [];
  for (const r of rows) {
    const identity = await getIdentity(client, r.puuid);
    if (!identity) continue;
    const games = Number(r.games);
    const wins = Number(r.wins);
    const games7d = Number(r.games7d);
    const wins7d = Number(r.wins7d);
    const wr = winrate(wins, games);
    const form = await getRecentForm(client, r.puuid, 5, queueIds);
    entries.push({
      identity,
      games,
      wins,
      losses: games - wins,
      winrate: wr,
      winrate7d: winrate(wins7d, games7d),
      form,
      rankSolo: r.rank_solo,
      rankFlex: r.rank_flex,
      avgPlacement: r.avg_placement != null ? round(Number(r.avg_placement)) : null,
      vsCrewAvgWinrate: wr != null && crewWr != null ? round(wr - crewWr, 4) : null,
    });
  }

  // Rank: by winrate desc, then games desc. Arena by placement asc.
  entries.sort((a, b) => {
    if (slug === "arena") {
      const pa = a.avgPlacement ?? 99;
      const pb = b.avgPlacement ?? 99;
      if (pa !== pb) return pa - pb;
    }
    return (b.winrate ?? -1) - (a.winrate ?? -1) || b.games - a.games;
  });
  return entries;
}

export async function getCrewCards(client: Queryable, puuids: string[]): Promise<CrewCards> {
  if (puuids.length === 0) {
    return {
      gamesThisWeek: 0,
      fiveStackWinrate: null,
      fiveStackGames: 0,
      bestDuo: null,
      biggestClimber: null,
      totalSharedGames: 0,
    };
  }

  const week = await queryOne<{ games_this_week: string; total_shared: string }>(
    `SELECT
       (SELECT count(DISTINCT m.match_id)
          FROM matches m JOIN match_participants mp ON mp.match_id = m.match_id
          WHERE mp.puuid = ANY($1) AND m.game_start > now() - interval '7 days')::text AS games_this_week,
       (SELECT count(*) FROM (
          SELECT mp.match_id FROM match_participants mp
          WHERE mp.puuid = ANY($1)
          GROUP BY mp.match_id HAVING count(DISTINCT mp.puuid) >= 2
        ) s)::text AS total_shared`,
    [puuids],
    client,
  );

  // Full-stack (>=5 crew members on the same team) winrate — Summoner's Rift only.
  const fiveStack = await queryOne<{ games: string; wins: string }>(
    `WITH stacks AS (
       SELECT m.match_id, mp.team_id AS side,
         count(*) AS n,
         bool_or(mp.win) AS won
       FROM match_participants mp
       JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1)
         AND m.queue_id IN (${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})
       GROUP BY m.match_id, side
       HAVING count(*) >= 5
     )
     SELECT count(*)::text AS games, count(*) FILTER (WHERE won)::text AS wins FROM stacks`,
    [puuids],
    client,
  );

  // Biggest climber proxy: best net (W-L) this week across ranked+flex (no LP history in v1).
  const climber = await queryOne<{ puuid: string; net: string }>(
    `SELECT mp.puuid,
       (count(*) FILTER (WHERE mp.win) - count(*) FILTER (WHERE NOT mp.win))::text AS net
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1)
       AND m.queue_id IN (${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})
       AND m.game_start > now() - interval '7 days'
     GROUP BY mp.puuid
     ORDER BY (count(*) FILTER (WHERE mp.win) - count(*) FILTER (WHERE NOT mp.win)) DESC
     LIMIT 1`,
    [puuids],
    client,
  );

  const synergies = await getDuoSynergies(client, puuids, "all", 3);
  const bestDuo = synergies.length ? synergies[0]! : null;

  const fsGames = Number(fiveStack?.games ?? 0);
  const fsWins = Number(fiveStack?.wins ?? 0);

  let biggestClimber: CrewCards["biggestClimber"] = null;
  if (climber && Number(climber.net) > 0) {
    const identity = await getIdentity(client, climber.puuid);
    if (identity) biggestClimber = { identity, lpDelta: Number(climber.net) };
  }

  return {
    gamesThisWeek: Number(week?.games_this_week ?? 0),
    fiveStackWinrate: winrate(fsWins, fsGames),
    fiveStackGames: fsGames,
    bestDuo,
    biggestClimber,
    totalSharedGames: Number(week?.total_shared ?? 0),
  };
}

const MIN_SYNERGY_GAMES = 3;

/** Assemble the full crew dashboard (PLAN §5.4) for a queue filter. */
export async function getCrewDashboard(
  client: Queryable,
  crewId: string,
  slug: QueueSlug = "all",
): Promise<CrewDashboard | null> {
  const crew = await getCrewSummary(client, crewId);
  if (!crew) return null;
  const puuids = await getCrewMemberPuuids(client, crewId);

  const members: PlayerIdentity[] = [];
  for (const p of puuids) {
    const id = await getIdentity(client, p);
    if (id) members.push(id);
  }

  const [leaderboard, cards, synergies, lineups, flexRoles, activity] = await Promise.all([
    getLeaderboard(client, puuids, slug),
    getCrewCards(client, puuids),
    getDuoSynergies(client, puuids, slug, MIN_SYNERGY_GAMES),
    getCrewLineups(client, puuids),
    getFlexRoles(client, puuids),
    getActivity(client, puuids, slug, 20),
  ]);

  return {
    crew,
    members,
    cards,
    leaderboard,
    synergies,
    lineups,
    flexRoles,
    activity,
    queue: slug,
    minSynergyGames: MIN_SYNERGY_GAMES,
  };
}
