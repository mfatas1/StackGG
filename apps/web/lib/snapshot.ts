import "server-only";
import {
  getPool,
  queryOne,
  resolveAndUpsertAccount,
  refreshAccountRanks,
  backfillMember,
  RiotApiError,
  parseRiotId,
} from "@crewstats/shared";
import { getPlayerSnapshot } from "@crewstats/stats";
import type { PlayerSnapshot } from "@crewstats/shared";
import { enqueueBackfill } from "./boss.js";

const FRESH_MIN = 30; // re-use existing data if backfilled within this window

export type SnapshotResult =
  | { ok: true; snapshot: PlayerSnapshot; backfilling: boolean }
  | { ok: false; code: "NOT_FOUND" | "RIOT_UNAVAILABLE" | "INVALID"; message: string };

/**
 * On-demand player snapshot (PLAN §5.2, P0 #1: stats within ~10s on first visit).
 * Resolves the account, does a synchronous recent backfill (storeRaw for
 * frequent-teammate detection), enqueues a full 90-day backfill in the
 * background, then computes the snapshot from the DB.
 */
export async function getOrBuildSnapshot(riotId: string, region: string): Promise<SnapshotResult> {
  if (!parseRiotId(riotId)) return { ok: false, code: "INVALID", message: "Enter a Riot ID like Name#TAG." };

  let puuid: string;
  try {
    const account = await resolveAndUpsertAccount(riotId, region);
    puuid = account.puuid;
  } catch (err) {
    if (err instanceof RiotApiError && err.status === 404)
      return { ok: false, code: "NOT_FOUND", message: `Riot ID "${riotId}" not found in ${region}.` };
    return { ok: false, code: "RIOT_UNAVAILABLE", message: "Riot API is temporarily unavailable." };
  }

  const fresh = await queryOne<{ recent: boolean }>(
    `SELECT (last_backfilled_at > now() - ($2 || ' minutes')::interval) AS recent
       FROM riot_accounts WHERE puuid = $1`,
    [puuid, String(FRESH_MIN)],
  );

  // We only kicked off a full background backfill if the account wasn't recently
  // refreshed — that's the only time the "still loading more" note is true.
  const backfilling = !fresh?.recent;
  if (backfilling) {
    try {
      await refreshAccountRanks(puuid, region);
      await backfillMember({ puuid, platform: region, recentOnlyPerQueue: 20, storeRaw: true });
    } catch (err) {
      console.warn(`[snapshot] backfill failed for ${puuid.slice(0, 10)}…: ${(err as Error).message}`);
    }
    // Full history in the background.
    await enqueueBackfill({ puuid, platform: region, days: 90 });
  }

  const snapshot = await getPlayerSnapshot(getPool(), puuid);
  if (!snapshot) return { ok: false, code: "NOT_FOUND", message: "No data available yet." };
  return { ok: true, snapshot, backfilling };
}
