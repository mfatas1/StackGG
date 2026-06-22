import { queryOne, type Queryable } from "@crewstats/shared";
import type { PlayerSnapshot } from "@crewstats/shared";
import { getIdentity, getPlayerModes, getRanks, getRecentForm } from "./modes.js";

/** The logged-out player snapshot (PLAN §5.2). Returns null if player unknown. */
export async function getPlayerSnapshot(client: Queryable, puuid: string): Promise<PlayerSnapshot | null> {
  const identity = await getIdentity(client, puuid);
  if (!identity) return null;

  const [modes, ranks, recentForm, last] = await Promise.all([
    getPlayerModes(client, puuid),
    getRanks(client, puuid),
    getRecentForm(client, puuid, 10),
    queryOne<{ last_updated: string | null }>(
      `SELECT GREATEST(
         (SELECT max(m.game_start) FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id WHERE mp.puuid = $1),
         (SELECT last_polled_at FROM riot_accounts WHERE puuid = $1)
       )::text AS last_updated`,
      [puuid],
      client,
    ),
  ]);

  return {
    identity,
    rankSolo: ranks.solo,
    rankFlex: ranks.flex,
    modes,
    recentForm,
    lastUpdated: last?.last_updated ?? null,
  };
}
