/**
 * Backfill the migration-003 challenge columns from each match's stored raw payload.
 * NO Riot requests. Idempotent (only fills rows where team_damage_pct IS NULL).
 *   npx tsx scripts/backfill-challenge-stats.ts
 */
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://localhost:5432/crewstats" });

async function main() {
  const matches = await pool.query<{ match_id: string; raw: { info?: { participants?: Record<string, unknown>[] } } }>(
    `SELECT match_id, raw FROM matches WHERE raw IS NOT NULL`,
  );
  console.log(`scanning ${matches.rows.length} matches…`);
  let updated = 0;
  for (const m of matches.rows) {
    const parts = m.raw?.info?.participants;
    if (!Array.isArray(parts)) continue;
    for (const p of parts) {
      const ch = (p as { challenges?: Record<string, number> }).challenges ?? {};
      const g = (k: string) => (k in ch ? Number(ch[k]) : null);
      const res = await pool.query(
        `UPDATE match_participants SET
           team_damage_pct=$3, skillshots_dodged=$4, kills_near_enemy_turret=$5,
           fountain_takedowns=$6, smiteless_steals=$7, ally_saves=$8
         WHERE match_id=$1 AND puuid=$2 AND team_damage_pct IS NULL`,
        [
          m.match_id, (p as { puuid: string }).puuid,
          g("teamDamagePercentage"), g("skillshotsDodged"), g("killsNearEnemyTurret"),
          g("takedownsInEnemyFountain"), g("epicMonsterStolenWithoutSmite"), g("saveAllyFromDeath"),
        ],
      );
      updated += res.rowCount ?? 0;
    }
  }
  console.log(`backfilled ${updated} rows.`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
