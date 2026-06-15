/**
 * Backfill carry_score / is_team_mvp on existing match_participants from matches.raw.
 * Safe to re-run / interrupt. Bulk-updates per page (one query, not per-row), and logs
 * from the first second.  Run once after migration 005:
 *   DATABASE_URL=... npx tsx scripts/backfill-carry.ts
 */
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { teamCarry } from "@crewstats/shared";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

async function main() {
  const DB = process.env.DATABASE_URL;
  if (!DB) { console.error("Missing DATABASE_URL"); process.exit(1); }

  process.stdout.write("connecting…\n");
  const client = new Client({ connectionString: DB });
  await client.connect();
  process.stdout.write("connected.\n");

  const total = (await client.query(`SELECT count(*)::int AS n FROM matches WHERE raw IS NOT NULL`)).rows[0].n;
  console.log(`scanning ${total} matches with stored raw…`);

  const PAGE = 300;
  let lastId = "";
  let scanned = 0;
  let updated = 0;
  const t0 = Date.now();

  for (;;) {
    const { rows } = await client.query<{ match_id: string; raw: unknown }>(
      `SELECT match_id, raw FROM matches
       WHERE raw IS NOT NULL AND match_id > $1
       ORDER BY match_id ASC LIMIT $2`,
      [lastId, PAGE],
    );
    if (rows.length === 0) break;

    const ids: string[] = [], puuids: string[] = [], scores: number[] = [], mvps: boolean[] = [];
    for (const m of rows) {
      lastId = m.match_id;
      scanned++;
      const ps = (m.raw as { info?: { participants?: unknown[] } })?.info?.participants;
      if (!Array.isArray(ps)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const [puuid, c] of teamCarry(ps as any)) {
        ids.push(m.match_id); puuids.push(puuid); scores.push(c.score); mvps.push(c.mvp);
      }
    }

    if (ids.length) {
      const r = await client.query(
        `UPDATE match_participants mp
           SET carry_score = v.score, is_team_mvp = v.mvp
         FROM unnest($1::text[], $2::text[], $3::real[], $4::boolean[]) AS v(match_id, puuid, score, mvp)
         WHERE mp.match_id = v.match_id AND mp.puuid = v.puuid`,
        [ids, puuids, scores, mvps],
      );
      updated += r.rowCount ?? 0;
    }
    console.log(`  ${scanned}/${total} matches · ${updated} rows updated · ${Math.round((Date.now() - t0) / 1000)}s`);
  }

  console.log(`Done. ${scanned} matches scanned, ${updated} participant rows updated.`);
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
