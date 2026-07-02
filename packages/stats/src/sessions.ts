import { query, type Queryable, QUEUES } from "@crewstats/shared";
import { NOT_REMAKE_SQL } from "./util.js";
import { getIdentities } from "./modes.js";

/**
 * Stack sessions (docs/competitive-casual-revamp.md, v2) — the group's games grouped into
 * nights. Nobody else has "your group's night-by-night story": it's the competitive review
 * tool and the casual memory feed in one. A session = consecutive shared Summoner's Rift games
 * with < SESSION_GAP between them; the stack's side of each game (largest same-side group).
 */
export interface CrewSession {
  startedAt: string; // ISO of the first game
  endedAt: string; // ISO of the last game
  games: number;
  wins: number;
  size: number; // the typical (modal) group size that night
  queue: "ranked" | "flex" | "mixed";
  topPuuid: string | null; // who carried the night (most game-MVPs)
}

const SESSION_GAP_MS = 4 * 60 * 60 * 1000; // a >4h gap starts a new session

interface GameRow {
  match_id: string;
  game_start: string;
  queue_id: number;
  win: boolean;
  size: number;
  top_puuid: string | null;
}

export async function getCrewSessions(client: Queryable, puuids: string[], limit = 8): Promise<CrewSession[]> {
  if (puuids.length < 2) return [];
  // One row per shared game = the stack's largest same-side group, with that side's result,
  // size, and the highest-carry crew member in it. Mirrors getCrewLineups' grouping.
  const rows = await query<GameRow>(
    `SELECT DISTINCT ON (g.match_id)
       g.match_id, g.game_start, g.queue_id, g.win, g.size, g.top_puuid
     FROM (
       SELECT mp.match_id, m.game_start, m.queue_id, mp.team_id,
              bool_and(mp.win) AS win,
              count(*) AS size,
              (array_agg(mp.puuid ORDER BY mp.carry_score DESC NULLS LAST))[1] AS top_puuid
       FROM match_participants mp
       JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1)
         AND m.queue_id IN (${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})
         AND ${NOT_REMAKE_SQL}
       GROUP BY mp.match_id, m.game_start, m.queue_id, mp.team_id
       HAVING count(*) >= 2
     ) g
     ORDER BY g.match_id, g.size DESC, g.game_start DESC`,
    [puuids],
    client,
  );

  // Newest first, then walk to cut sessions on time gaps.
  rows.sort((a, b) => new Date(b.game_start).getTime() - new Date(a.game_start).getTime());

  const sessions: CrewSession[] = [];
  let bucket: GameRow[] = [];
  const flush = () => {
    if (!bucket.length) return;
    const wins = bucket.filter((g) => g.win).length;
    const sizeCount = new Map<number, number>();
    const mvpCount = new Map<string, number>();
    const queues = new Set<number>();
    for (const g of bucket) {
      sizeCount.set(g.size, (sizeCount.get(g.size) ?? 0) + 1);
      queues.add(g.queue_id);
      if (g.top_puuid) mvpCount.set(g.top_puuid, (mvpCount.get(g.top_puuid) ?? 0) + 1);
    }
    const size = [...sizeCount.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
    const topPuuid = [...mvpCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const queue =
      queues.size > 1 ? "mixed" : queues.has(QUEUES.RANKED_FLEX) ? "flex" : "ranked";
    sessions.push({
      startedAt: bucket[bucket.length - 1]!.game_start,
      endedAt: bucket[0]!.game_start,
      games: bucket.length,
      wins,
      size,
      queue,
      topPuuid,
    });
    bucket = [];
  };

  for (let i = 0; i < rows.length; i++) {
    const g = rows[i]!;
    if (bucket.length === 0) {
      bucket.push(g);
      continue;
    }
    const prev = bucket[bucket.length - 1]!;
    if (new Date(prev.game_start).getTime() - new Date(g.game_start).getTime() <= SESSION_GAP_MS) {
      bucket.push(g);
    } else {
      flush();
      bucket.push(g);
    }
    if (sessions.length >= limit) break;
  }
  flush();

  return sessions.slice(0, limit);
}
