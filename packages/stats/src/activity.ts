import { query, type Queryable } from "@crewstats/shared";
import type { ActivityItem, QueueSlug } from "@crewstats/shared";
import { queueIdsForSlug, slugForQueueId } from "./util.js";

/** Recent shared games (>=2 crew members) with per-member performance (PLAN §5.4). */
export async function getActivity(
  client: Queryable,
  puuids: string[],
  slug: QueueSlug,
  limit = 20,
): Promise<ActivityItem[]> {
  if (puuids.length === 0) return [];
  const queueIds = queueIdsForSlug(slug);

  const matches = await query<{
    match_id: string;
    queue_id: number;
    game_start: string;
    game_duration: number;
  }>(
    `SELECT m.match_id, m.queue_id, m.game_start::text AS game_start, m.game_duration
     FROM matches m
     JOIN match_participants mp ON mp.match_id = m.match_id
     WHERE mp.puuid = ANY($1) ${queueIds ? "AND m.queue_id = ANY($3::int[])" : ""}
     GROUP BY m.match_id, m.queue_id, m.game_start, m.game_duration
     HAVING count(DISTINCT mp.puuid) >= 2
     ORDER BY m.game_start DESC
     LIMIT $2`,
    queueIds ? [puuids, limit, queueIds] : [puuids, limit],
    client,
  );
  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m.match_id);
  const parts = await query<{
    match_id: string;
    puuid: string;
    riot_id: string;
    champion_name: string;
    kills: number;
    deaths: number;
    assists: number;
    win: boolean;
    team_id: number;
    placement: number | null;
    is_team_mvp: boolean | null;
  }>(
    `SELECT mp.match_id, mp.puuid, ra.riot_id, mp.champion_name,
            mp.kills, mp.deaths, mp.assists, mp.win, mp.team_id, mp.placement, mp.is_team_mvp
     FROM match_participants mp
     JOIN riot_accounts ra ON ra.puuid = mp.puuid
     WHERE mp.match_id = ANY($1) AND mp.puuid = ANY($2)
     ORDER BY mp.match_id`,
    [matchIds, puuids],
    client,
  );

  const byMatch = new Map<string, ActivityItem["members"]>();
  for (const p of parts) {
    const arr = byMatch.get(p.match_id) ?? [];
    arr.push({
      puuid: p.puuid,
      riotId: p.riot_id,
      championName: p.champion_name,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      win: p.win,
      teamId: p.team_id,
      placement: p.placement,
      isTeamMvp: p.is_team_mvp ?? false,
    });
    byMatch.set(p.match_id, arr);
  }

  return matches.map((m) => ({
    matchId: m.match_id,
    queueId: m.queue_id,
    queueSlug: slugForQueueId(m.queue_id),
    gameStart: m.game_start,
    gameDuration: m.game_duration,
    members: byMatch.get(m.match_id) ?? [],
  }));
}
