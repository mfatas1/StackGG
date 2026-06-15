/**
 * Backfill carry_score / is_team_mvp on existing match_participants from matches.raw.
 * Safe to re-run. Run once after deploying migration 005:
 *   tsx scripts/backfill-carry.ts
 */
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { teamCarry } from "@crewstats/shared";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

async function main() {
  const DB = process.env.DATABASE_URL;
  if (!DB) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const client = new Client({ connectionString: DB });
  await client.connect();

  let processed = 0;
  let updated = 0;
  const PAGE = 500;
  let lastId = "";

  for (;;) {
    const { rows } = await client.query<{ match_id: string; raw: unknown }>(
      `SELECT match_id, raw FROM matches
       WHERE raw IS NOT NULL AND match_id > $1
       ORDER BY match_id ASC LIMIT $2`,
      [lastId, PAGE],
    );
    if (rows.length === 0) break;

    for (const m of rows) {
      lastId = m.match_id;
      processed++;
      const participants = (m.raw as { info?: { participants?: unknown[] } })?.info?.participants;
      if (!Array.isArray(participants)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const carry = teamCarry(participants as any);
      for (const [puuid, c] of carry) {
        const r = await client.query(
          `UPDATE match_participants SET carry_score = $3, is_team_mvp = $4
           WHERE match_id = $1 AND puuid = $2`,
          [m.match_id, puuid, c.score, c.mvp],
        );
        updated += r.rowCount ?? 0;
      }
    }
    console.log(`  …${processed} matches, ${updated} participant rows updated`);
  }

  console.log(`Done. ${processed} matches scanned, ${updated} participant rows updated.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
