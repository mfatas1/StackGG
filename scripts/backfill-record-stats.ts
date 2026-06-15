/**
 * Backfill the records-board participant columns (migration 002) from each match's
 * cold-stored raw payload (matches.raw) — NO Riot requests. Only fills rows where the
 * stats are still NULL, so it's safe to re-run. Matches without raw stay NULL until
 * they're re-ingested.
 *
 *   npx tsx scripts/backfill-record-stats.ts
 */
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://localhost:5432/crewstats" });

async function main() {
  const matches = await pool.query<{ match_id: string; raw: { info?: { participants?: Record<string, unknown>[] } } }>(
    `SELECT match_id, raw FROM matches WHERE raw IS NOT NULL`,
  );
  console.log(`scanning ${matches.rows.length} matches with raw payloads…`);

  let updated = 0;
  let touchedMatches = 0;
  for (const m of matches.rows) {
    const parts = m.raw?.info?.participants;
    if (!Array.isArray(parts)) continue;
    let any = false;
    for (const p of parts) {
      const g = (k: string) => Number((p as Record<string, number | undefined>)[k] ?? 0);
      const soloKills = Number((p as { challenges?: { soloKills?: number } }).challenges?.soloKills ?? 0);
      const res = await pool.query(
        `UPDATE match_participants SET
           time_dead=$3, longest_life=$4, killing_spree=$5, multikill=$6, pentakills=$7,
           damage_taken=$8, self_mitigated=$9, heal_teammates=$10, shield_teammates=$11,
           cc_time=$12, largest_crit=$13, objectives_stolen=$14, solo_kills=$15
         WHERE match_id=$1 AND puuid=$2 AND time_dead IS NULL`,
        [
          m.match_id, (p as { puuid: string }).puuid,
          g("totalTimeSpentDead"), g("longestTimeSpentLiving"), g("largestKillingSpree"),
          g("largestMultiKill"), g("pentaKills"), g("totalDamageTaken"), g("damageSelfMitigated"),
          g("totalHealsOnTeammates"), g("totalDamageShieldedOnTeammates"), g("timeCCingOthers"),
          g("largestCriticalStrike"), g("objectivesStolen"), soloKills,
        ],
      );
      if (res.rowCount) { updated += res.rowCount; any = true; }
    }
    if (any) touchedMatches++;
  }
  console.log(`backfilled ${updated} participant rows across ${touchedMatches} matches.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
