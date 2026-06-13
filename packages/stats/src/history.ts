import { query, type Queryable, QUEUES } from "@crewstats/shared";
import type { MatchHistoryItem } from "@crewstats/shared";
import { queueIdsForSlug, slugForQueueId } from "./util.js";
import type { QueueSlug } from "@crewstats/shared";

/**
 * Per-player match history (op.gg-style game-by-game list). Optionally filtered
 * by queue and/or champion. `crewPuuids` lets us annotate which crewmates were in
 * each game (same side or opposing) for the crew-context view.
 */
export async function getMatchHistory(
  client: Queryable,
  puuid: string,
  opts: {
    slug?: QueueSlug;
    championId?: number;
    limit?: number;
    offset?: number;
    crewPuuids?: string[];
  } = {},
): Promise<MatchHistoryItem[]> {
  const queueIds = opts.slug ? queueIdsForSlug(opts.slug) : null;
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = opts.offset ?? 0;

  const params: unknown[] = [puuid];
  let i = 2;
  let where = "mp.puuid = $1";
  if (queueIds) {
    where += ` AND m.queue_id = ANY($${i}::int[])`;
    params.push(queueIds);
    i++;
  }
  if (opts.championId != null) {
    where += ` AND mp.champion_id = $${i}`;
    params.push(opts.championId);
    i++;
  }
  const limIdx = i;
  params.push(limit);
  const offIdx = i + 1;
  params.push(offset);

  const rows = await query<{
    match_id: string;
    queue_id: number;
    game_start: string;
    game_duration: number;
    champion_id: number;
    champion_name: string;
    role: string | null;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    vision_score: number;
    placement: number | null;
    team_id: number;
    subteam_id: number | null;
  }>(
    `SELECT mp.match_id, m.queue_id, m.game_start::text AS game_start, m.game_duration,
            mp.champion_id, mp.champion_name, mp.role, mp.win, mp.kills, mp.deaths,
            mp.assists, mp.cs, mp.vision_score, mp.placement, mp.team_id, mp.subteam_id
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE ${where}
     ORDER BY m.game_start DESC
     LIMIT $${limIdx} OFFSET $${offIdx}`,
    params,
    client,
  );
  if (rows.length === 0) return [];

  // Annotate crewmates present in each match.
  const crew = (opts.crewPuuids ?? []).filter((p) => p !== puuid);
  const mateByMatch = new Map<string, { riotId: string; championName: string; sameSide: boolean }[]>();
  if (crew.length) {
    const matchIds = rows.map((r) => r.match_id);
    const mates = await query<{
      match_id: string;
      riot_id: string;
      champion_name: string;
      team_id: number;
      subteam_id: number | null;
      queue_id: number;
    }>(
      `SELECT mp.match_id, ra.riot_id, mp.champion_name, mp.team_id, mp.subteam_id, m.queue_id
       FROM match_participants mp
       JOIN riot_accounts ra ON ra.puuid = mp.puuid
       JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.match_id = ANY($1) AND mp.puuid = ANY($2)`,
      [matchIds, crew],
      client,
    );
    const meByMatch = new Map(rows.map((r) => [r.match_id, r]));
    for (const mate of mates) {
      const me = meByMatch.get(mate.match_id);
      if (!me) continue;
      const sameSide =
        mate.queue_id === QUEUES.ARENA ? mate.subteam_id === me.subteam_id : mate.team_id === me.team_id;
      const arr = mateByMatch.get(mate.match_id) ?? [];
      arr.push({ riotId: mate.riot_id, championName: mate.champion_name, sameSide });
      mateByMatch.set(mate.match_id, arr);
    }
  }

  return rows.map((r) => ({
    matchId: r.match_id,
    queueId: r.queue_id,
    queueSlug: slugForQueueId(r.queue_id),
    gameStart: r.game_start,
    gameDuration: r.game_duration,
    championId: r.champion_id,
    championName: r.champion_name,
    role: r.role,
    win: r.win,
    kills: r.kills,
    deaths: r.deaths,
    assists: r.assists,
    cs: r.cs,
    visionScore: r.vision_score,
    placement: r.placement,
    crewmates: mateByMatch.get(r.match_id) ?? [],
  }));
}
