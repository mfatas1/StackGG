/**
 * One-time identity heal after a Riot API key change. PUUIDs are scoped to the key
 * that minted them, so accounts stored under the old key resolve to a new PUUID under
 * the new one (and the old PUUID stops decrypting → match-v5 400). Migration 006 marks
 * every account stale; this re-resolves each stale account under the current key and,
 * via resolveAndUpsertAccount's self-heal, migrates its match history + crew links onto
 * the new PUUID (stats are key-independent, so nothing is re-downloaded).
 *
 * Safe to re-run: once an account is healed it's no longer stale, so later runs skip it.
 *   DATABASE_URL=... RIOT_KEY=... npx tsx scripts/remap-puuids.ts
 */
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, query, resolveAndUpsertAccount, refreshAccountRanks } from "@crewstats/shared";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

async function main() {
  const stale = await query<{ puuid: string; riot_id: string; tag: string; region: string }>(
    `SELECT puuid, riot_id, tag, COALESCE(region, 'euw1') AS region FROM riot_accounts WHERE is_stale = true`,
  );
  if (!stale.length) {
    console.log("[remap] no accounts need re-resolving — skipping.");
    await getPool().end();
    return;
  }
  console.log(`[remap] re-resolving ${stale.length} account(s) under the current key…`);

  let migrated = 0;
  let current = 0;
  let failed = 0;
  for (const a of stale) {
    const label = `${a.riot_id}#${a.tag}`;
    try {
      const row = await resolveAndUpsertAccount(`${a.riot_id}#${a.tag}`, a.region);
      if (row.puuid !== a.puuid) {
        migrated++;
        console.log(`[remap] ${label}: ${a.puuid.slice(0, 8)}… → ${row.puuid.slice(0, 8)}… (history + crews moved)`);
      } else {
        current++;
      }
      // Ranks/icon were fetched under the old key; refresh them for the new PUUID.
      await refreshAccountRanks(row.puuid, a.region).catch(() => {});
    } catch (err) {
      failed++;
      // Renamed/deleted accounts can't be re-resolved — clear the flag so we don't
      // retry them on every boot. Real matches stay under the old PUUID untouched.
      await getPool()
        .query(`UPDATE riot_accounts SET is_stale = false WHERE puuid = $1`, [a.puuid])
        .catch(() => {});
      console.warn(`[remap] ${label} could not be re-resolved: ${(err as Error).message}`);
    }
  }

  console.log(`[remap] done: ${migrated} migrated, ${current} already current, ${failed} failed.`);
  await getPool().end();
}

main().catch((err) => {
  console.error("[remap] fatal:", (err as Error).message);
  process.exit(1);
});
