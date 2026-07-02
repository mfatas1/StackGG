/**
 * One-off deep backfill to extend a crew's history beyond the default 90 days.
 *   tsx scripts/deep-backfill.ts [slug] [days]
 * Reuses the shared backfillMember (global rate limiter + dedup), so it only
 * fetches the older matches not already stored.
 */
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

import { getPool, query, closePool, backfillMember } from "@crewstats/shared";

const slug = process.argv[2] ?? "flex-diff";
const days = Number(process.argv[3] ?? 180);

async function main() {
  const members = await query<{ puuid: string; riot_id: string; region: string }>(
    `SELECT cm.puuid, ra.riot_id, COALESCE(ra.region,'euw1') AS region
       FROM crew_members cm
       JOIN riot_accounts ra ON ra.puuid = cm.puuid
       JOIN crews c ON c.id = cm.crew_id
      WHERE c.slug = $1`,
    [slug],
  );
  if (!members.length) {
    console.error(`No members for crew '${slug}'`);
    process.exit(1);
  }
  const tracked = new Set(members.map((m) => m.puuid));
  console.log(`Deep backfill: crew '${slug}', ${members.length} members, ${days} days.\n`);

  for (const m of members) {
    const t0 = Date.now();
    const res = await backfillMember({
      puuid: m.puuid,
      platform: m.region,
      days,
      trackedPuuids: tracked,
      storeRaw: false,
    });
    const secs = Math.round((Date.now() - t0) / 1000);
    console.log(
      `  ${m.riot_id.padEnd(18)} fetched ${res.fetched}/${res.candidateMatchIds} new matches (${res.participantsWritten} rows) in ${secs}s`,
    );
  }

  const range = await query<{ earliest: string; latest: string; rows: string }>(
    `SELECT min(m.game_start)::date::text AS earliest, max(m.game_start)::date::text AS latest, count(*)::text AS rows
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
       JOIN crew_members cm ON cm.puuid = mp.puuid JOIN crews c ON c.id = cm.crew_id
      WHERE c.slug = $1`,
    [slug],
  );
  console.log(`\nDone. Crew data now spans ${range[0]?.earliest} → ${range[0]?.latest} (${range[0]?.rows} rows).`);
  await closePool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
