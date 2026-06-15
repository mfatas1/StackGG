/**
 * Re-fetch matches that were ingested before the records columns existed (raw IS NULL),
 * and fill in the new per-game stats + store raw. Match-v5 only (NO timeline). Rate-limited
 * via the shared RiotClient. Idempotent: skips matches that already have raw.
 *
 *   npx tsx scripts/backfill-refetch-stats.ts
 */
import "dotenv/config";
import { getRiotClient, getPool, query } from "@crewstats/shared";

async function main() {
  const pool = getPool();
  const client = getRiotClient();
  const matches = (
    await query<{ match_id: string }>(`SELECT match_id FROM matches WHERE raw IS NULL ORDER BY game_start DESC`, [], pool)
  ).map((r) => r.match_id);
  console.log(`re-fetching ${matches.length} matches missing raw…`);

  let done = 0, updated = 0, failed = 0;
  for (const mid of matches) {
    const platform = mid.slice(0, mid.indexOf("_")).toLowerCase();
    let match;
    try {
      match = await client.getMatch(mid, platform);
    } catch (e) {
      failed++;
      if (failed <= 8) console.log(`  fetch fail ${mid}: ${(e as Error).message}`);
      continue;
    }
    const info = match.info;
    await pool.query(`UPDATE matches SET raw = $2 WHERE match_id = $1`, [mid, JSON.stringify(match)]);
    for (const p of info.participants as Record<string, number | undefined>[] & { puuid: string }[]) {
      const g = (k: string) => Number((p as Record<string, number | undefined>)[k] ?? 0);
      const solo = Number((p as { challenges?: { soloKills?: number } }).challenges?.soloKills ?? 0);
      const r = await pool.query(
        `UPDATE match_participants SET time_dead=$3, longest_life=$4, killing_spree=$5, multikill=$6, pentakills=$7,
           damage_taken=$8, self_mitigated=$9, heal_teammates=$10, shield_teammates=$11, cc_time=$12,
           largest_crit=$13, objectives_stolen=$14, solo_kills=$15
         WHERE match_id=$1 AND puuid=$2`,
        [mid, (p as { puuid: string }).puuid,
          g("totalTimeSpentDead"), g("longestTimeSpentLiving"), g("largestKillingSpree"), g("largestMultiKill"),
          g("pentaKills"), g("totalDamageTaken"), g("damageSelfMitigated"), g("totalHealsOnTeammates"),
          g("totalDamageShieldedOnTeammates"), g("timeCCingOthers"), g("largestCriticalStrike"), g("objectivesStolen"), solo],
      );
      updated += r.rowCount ?? 0;
    }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${matches.length} matches · ${updated} rows · ${failed} failed`);
  }
  console.log(`done: ${done} re-fetched, ${updated} rows updated, ${failed} failed`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
