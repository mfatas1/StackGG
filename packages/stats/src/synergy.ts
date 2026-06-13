import { query, type Queryable } from "@crewstats/shared";
import type { DuoSynergy, FlexRoleStat, QueueSlug, PlayerIdentity } from "@crewstats/shared";
import { QUEUES } from "@crewstats/shared";
import { winrate, queueIdsForSlug } from "./util.js";
import { getIdentity } from "./modes.js";

async function identityMap(client: Queryable, puuids: string[]): Promise<Map<string, PlayerIdentity>> {
  const map = new Map<string, PlayerIdentity>();
  for (const p of puuids) {
    const id = await getIdentity(client, p);
    if (id) map.set(p, id);
  }
  return map;
}

/** Per-member games/wins within a queue filter, for "winrate apart" math. */
async function memberTotals(
  client: Queryable,
  puuids: string[],
  queueIds: number[] | null,
): Promise<Map<string, { games: number; wins: number }>> {
  const rows = await query<{ puuid: string; games: string; wins: string }>(
    `SELECT mp.puuid,
       count(*)::text AS games,
       count(*) FILTER (WHERE mp.win)::text AS wins
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1) ${queueIds ? "AND m.queue_id = ANY($2::int[])" : ""}
     GROUP BY mp.puuid`,
    queueIds ? [puuids, queueIds] : [puuids],
    client,
  );
  const map = new Map<string, { games: number; wins: number }>();
  for (const r of rows) map.set(r.puuid, { games: Number(r.games), wins: Number(r.wins) });
  return map;
}

/**
 * Duo synergy: games/wins for every crew pair that played the SAME match on the
 * SAME team (same Arena subteam). Hidden below `minGames` (CLAUDE.md: hide below
 * 3 shared games); sample size always returned so the UI can label it.
 */
export async function getDuoSynergies(
  client: Queryable,
  puuids: string[],
  slug: QueueSlug,
  minGames = 3,
): Promise<DuoSynergy[]> {
  if (puuids.length < 2) return [];
  const queueIds = queueIdsForSlug(slug);
  const rows = await query<{ pa: string; pb: string; games: string; wins: string }>(
    `SELECT a.puuid AS pa, b.puuid AS pb,
       count(*)::text AS games,
       count(*) FILTER (WHERE a.win)::text AS wins
     FROM match_participants a
     JOIN matches m ON m.match_id = a.match_id
     JOIN match_participants b
       ON b.match_id = a.match_id AND a.puuid < b.puuid
      AND CASE WHEN m.queue_id = ${QUEUES.ARENA}
               THEN a.subteam_id = b.subteam_id
               ELSE a.team_id = b.team_id END
     WHERE a.puuid = ANY($1) AND b.puuid = ANY($1)
       ${queueIds ? "AND m.queue_id = ANY($2::int[])" : ""}
     GROUP BY a.puuid, b.puuid
     HAVING count(*) >= ${minGames}`,
    queueIds ? [puuids, queueIds] : [puuids],
    client,
  );

  const totals = await memberTotals(client, puuids, queueIds);
  const ids = await identityMap(client, puuids);

  const out: DuoSynergy[] = [];
  for (const r of rows) {
    const a = ids.get(r.pa);
    const b = ids.get(r.pb);
    if (!a || !b) continue;
    const games = Number(r.games);
    const wins = Number(r.wins);
    const ta = totals.get(r.pa) ?? { games: 0, wins: 0 };
    const tb = totals.get(r.pb) ?? { games: 0, wins: 0 };
    const aApartGames = ta.games - games;
    const bApartGames = tb.games - games;
    out.push({
      a,
      b,
      games,
      wins,
      winrate: winrate(wins, games),
      aWinrateApart: winrate(ta.wins - wins, aApartGames),
      bWinrateApart: winrate(tb.wins - wins, bApartGames),
    });
  }
  out.sort((x, y) => (y.winrate ?? 0) - (x.winrate ?? 0) || y.games - x.games);
  return out;
}

/** Flex role-assignment winrates (PLAN P1: "we win 68% when X junglas"). */
export async function getFlexRoles(client: Queryable, puuids: string[]): Promise<FlexRoleStat[]> {
  if (puuids.length === 0) return [];
  const rows = await query<{ puuid: string; role: string; games: string; wins: string }>(
    `SELECT mp.puuid, mp.role,
       count(*)::text AS games,
       count(*) FILTER (WHERE mp.win)::text AS wins
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1) AND m.queue_id = ${QUEUES.RANKED_FLEX}
       AND mp.role IS NOT NULL AND mp.role <> ''
     GROUP BY mp.puuid, mp.role`,
    [puuids],
    client,
  );
  const ids = await identityMap(client, puuids);
  const out: FlexRoleStat[] = [];
  for (const r of rows) {
    const identity = ids.get(r.puuid);
    if (!identity) continue;
    const games = Number(r.games);
    const wins = Number(r.wins);
    out.push({ identity, role: r.role, games, wins, winrate: winrate(wins, games) });
  }
  out.sort((x, y) => y.games - x.games || (y.winrate ?? 0) - (x.winrate ?? 0));
  return out;
}
