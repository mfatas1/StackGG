import { query, type Queryable } from "@crewstats/shared";
import type { FrequentTeammate } from "@crewstats/shared";

/**
 * Frequent-teammate detection for the player snapshot (PLAN §5.2, the invite
 * hook). Computed from matches.raw (cold storage) because teammates of a
 * not-yet-tracked solo visitor have no match_participants rows of their own.
 * Restricted to Summoner's Rift queues (real 5-player teams); Arena's 100/200
 * split isn't a meaningful "team".
 */
export async function getFrequentTeammates(
  client: Queryable,
  puuid: string,
  limit = 5,
  minGames = 3,
): Promise<FrequentTeammate[]> {
  const rows = await query<{
    puuid: string;
    name: string | null;
    tag: string | null;
    games: string;
    wins: string;
  }>(
    `WITH my AS (
       -- Bound to the most recent SR games and carry raw so we expand the JSON once,
       -- not all-time × twice. 80 games is plenty to surface who you queue with.
       SELECT m.match_id, m.raw,
         (SELECT (p->>'teamId')::int
            FROM jsonb_array_elements(m.raw->'info'->'participants') p
           WHERE p->>'puuid' = $1) AS my_team
       FROM matches m
       JOIN match_participants mp ON mp.match_id = m.match_id AND mp.puuid = $1
       WHERE m.raw IS NOT NULL AND m.queue_id <> 1700
       ORDER BY m.game_start DESC
       LIMIT 80
     )
     SELECT p->>'puuid' AS puuid,
            p->>'riotIdGameName' AS name,
            p->>'riotIdTagline' AS tag,
            count(*)::text AS games,
            count(*) FILTER (WHERE (p->>'win')::boolean)::text AS wins
     FROM my
     CROSS JOIN LATERAL jsonb_array_elements(my.raw->'info'->'participants') p
     WHERE (p->>'teamId')::int = my.my_team AND p->>'puuid' <> $1
     GROUP BY 1, 2, 3
     HAVING count(*) >= $3
     ORDER BY count(*) DESC, count(*) FILTER (WHERE (p->>'win')::boolean) DESC
     LIMIT $2`,
    [puuid, limit, minGames],
    client,
  );
  return rows.map((r) => ({
    puuid: r.puuid,
    riotId: r.name ?? "Unknown",
    tag: r.tag ?? "",
    gamesTogether: Number(r.games),
    winsTogether: Number(r.wins),
  }));
}
