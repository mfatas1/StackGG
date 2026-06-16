import { query, queryOne, type Queryable, TRACKED_QUEUE_IDS, QUEUES, QUEUE_SLUG, isArena } from "@crewstats/shared";
import type { ModeStats, PlayerSnapshot, PlayerIdentity, RankInfo } from "@crewstats/shared";
import { kda, winrate, round, slugForQueueId, NOT_REMAKE_SQL } from "./util.js";

interface ModeAggRow {
  games: string;
  wins: string;
  sum_k: string;
  sum_d: string;
  sum_a: string;
  avg_placement: string | null;
}

interface ChampRow {
  champion_id: number;
  champion_name: string;
  games: string;
  wins: string;
}

/** Per-mode stats for one player in one queue. */
export async function getModeStats(
  client: Queryable,
  puuid: string,
  queueId: number,
): Promise<ModeStats> {
  const agg = await queryOne<ModeAggRow>(
    `SELECT
       count(*)::text AS games,
       count(*) FILTER (WHERE mp.win)::text AS wins,
       COALESCE(sum(mp.kills),0)::text AS sum_k,
       COALESCE(sum(mp.deaths),0)::text AS sum_d,
       COALESCE(sum(mp.assists),0)::text AS sum_a,
       ${isArena(queueId) ? "avg(mp.placement)::text" : "NULL"} AS avg_placement
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = $1 AND m.queue_id = $2 AND ${NOT_REMAKE_SQL}`,
    [puuid, queueId],
    client,
  );

  const champs = await query<ChampRow>(
    `SELECT mp.champion_id, mp.champion_name,
       count(*)::text AS games,
       count(*) FILTER (WHERE mp.win)::text AS wins
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = $1 AND m.queue_id = $2 AND ${NOT_REMAKE_SQL}
     GROUP BY mp.champion_id, mp.champion_name
     ORDER BY count(*) DESC, count(*) FILTER (WHERE mp.win) DESC, mp.champion_name ASC
     LIMIT 6`,
    [puuid, queueId],
    client,
  );

  const games = Number(agg?.games ?? 0);
  const wins = Number(agg?.wins ?? 0);
  const sumK = Number(agg?.sum_k ?? 0);
  const sumD = Number(agg?.sum_d ?? 0);
  const sumA = Number(agg?.sum_a ?? 0);

  return {
    queueId,
    queueSlug: slugForQueueId(queueId),
    games,
    wins,
    losses: games - wins,
    winrate: winrate(wins, games),
    avgKills: games ? round(sumK / games) : 0,
    avgDeaths: games ? round(sumD / games) : 0,
    avgAssists: games ? round(sumA / games) : 0,
    kda: round(kda(sumK, sumD, sumA)),
    avgPlacement: agg?.avg_placement != null ? round(Number(agg.avg_placement)) : null,
    topChampions: champs.map((c) => ({
      championId: c.champion_id,
      championName: c.champion_name,
      games: Number(c.games),
      wins: Number(c.wins),
    })),
  };
}

/** All four tracked modes for a player. */
export async function getPlayerModes(client: Queryable, puuid: string): Promise<ModeStats[]> {
  const out: ModeStats[] = [];
  for (const q of TRACKED_QUEUE_IDS) {
    out.push(await getModeStats(client, puuid, q));
  }
  return out;
}

/** Recent W/L across tracked queues, most recent first. */
export async function getRecentForm(
  client: Queryable,
  puuid: string,
  limit = 5,
  queueIds: number[] | null = null,
): Promise<("W" | "L")[]> {
  const rows = await query<{ win: boolean }>(
    `SELECT mp.win
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = $1 AND ${NOT_REMAKE_SQL} ${queueIds ? "AND m.queue_id = ANY($3::int[])" : ""}
     ORDER BY m.game_start DESC
     LIMIT $2`,
    queueIds ? [puuid, limit, queueIds] : [puuid, limit],
    client,
  );
  return rows.map((r) => (r.win ? "W" : "L"));
}

export async function getIdentity(client: Queryable, puuid: string): Promise<PlayerIdentity | null> {
  const r = await queryOne<{
    puuid: string;
    riot_id: string;
    tag: string;
    region: string;
    profile_icon: number | null;
    is_stale: boolean;
  }>(
    `SELECT puuid, riot_id, tag, region, profile_icon, is_stale FROM riot_accounts WHERE puuid = $1`,
    [puuid],
    client,
  );
  if (!r) return null;
  return {
    puuid: r.puuid,
    riotId: r.riot_id,
    tag: r.tag,
    region: r.region,
    profileIcon: r.profile_icon,
    isStale: r.is_stale,
  };
}

/** Batched identity lookup — one query for many puuids (replaces per-member getIdentity loops). */
export async function getIdentities(
  client: Queryable,
  puuids: string[],
): Promise<Map<string, PlayerIdentity>> {
  const map = new Map<string, PlayerIdentity>();
  if (puuids.length === 0) return map;
  const rows = await query<{
    puuid: string;
    riot_id: string;
    tag: string;
    region: string;
    profile_icon: number | null;
    is_stale: boolean;
  }>(
    `SELECT puuid, riot_id, tag, region, profile_icon, is_stale FROM riot_accounts WHERE puuid = ANY($1)`,
    [puuids],
    client,
  );
  for (const r of rows) {
    map.set(r.puuid, {
      puuid: r.puuid,
      riotId: r.riot_id,
      tag: r.tag,
      region: r.region,
      profileIcon: r.profile_icon,
      isStale: r.is_stale,
    });
  }
  return map;
}

/** Batched recent form — one windowed query for many puuids, most-recent-first per puuid. */
export async function getRecentForms(
  client: Queryable,
  puuids: string[],
  limit = 5,
  queueIds: number[] | null = null,
): Promise<Map<string, ("W" | "L")[]>> {
  const map = new Map<string, ("W" | "L")[]>();
  if (puuids.length === 0) return map;
  const params: unknown[] = [puuids, limit];
  const queueClause = queueIds ? "AND m.queue_id = ANY($3::int[])" : "";
  if (queueIds) params.push(queueIds);
  const rows = await query<{ puuid: string; win: boolean }>(
    `SELECT puuid, win FROM (
       SELECT mp.puuid, mp.win,
         row_number() OVER (PARTITION BY mp.puuid ORDER BY m.game_start DESC) AS rn
       FROM match_participants mp
       JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1) AND ${NOT_REMAKE_SQL} ${queueClause}
     ) t
     WHERE rn <= $2
     ORDER BY puuid, rn`,
    params,
    client,
  );
  for (const r of rows) {
    const arr = map.get(r.puuid) ?? [];
    arr.push(r.win ? "W" : "L");
    map.set(r.puuid, arr);
  }
  return map;
}

export async function getRanks(
  client: Queryable,
  puuid: string,
): Promise<{ solo: RankInfo | null; flex: RankInfo | null; lastPolled: string | null }> {
  const r = await queryOne<{ rank_solo: RankInfo | null; rank_flex: RankInfo | null; last_polled_at: string | null }>(
    `SELECT rank_solo, rank_flex, last_polled_at FROM riot_accounts WHERE puuid = $1`,
    [puuid],
    client,
  );
  return { solo: r?.rank_solo ?? null, flex: r?.rank_flex ?? null, lastPolled: r?.last_polled_at ?? null };
}
