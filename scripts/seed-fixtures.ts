/**
 * Seed the (test or dev) database from checked-in fixture matches.
 * Used by stats tests and for eyeballing the dashboard without hitting Riot.
 *
 *   tsx scripts/seed-fixtures.ts          # seed DATABASE_URL
 *   VITEST=1 tsx scripts/seed-fixtures.ts # seed DATABASE_URL_TEST
 */
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

import { getPool, closePool, persistMatch } from "@crewstats/shared";
import { loadFixtureMatches } from "@crewstats/shared/fixtures";

export async function seedFixtures(): Promise<{ matches: number; participants: number }> {
  const pool = getPool();
  const matches = loadFixtureMatches();
  let m = 0;
  let parts = 0;
  for (const match of matches) {
    // trackedPuuids = null -> persist every participant, so stats have full lobbies.
    const res = await persistMatch(pool, match, null, { storeRaw: false });
    if (res.matchInserted) m++;
    parts += res.participantsWritten;
  }
  return { matches: m, participants: parts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedFixtures()
    .then((r) => {
      console.log(`Seeded ${r.matches} matches, ${r.participants} participant rows.`);
      return closePool();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
