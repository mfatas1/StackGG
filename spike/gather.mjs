// Throwaway: resolve the test crew's PUUIDs and grab an ARAM fixture.
// RIOT_KEY=... node spike/gather.mjs
import { writeFile, mkdir } from "node:fs/promises";

const KEY = process.env.RIOT_KEY;
if (!KEY) { console.error("RIOT_KEY missing"); process.exit(1); }

const PLATFORM = "euw1";
const REGIONAL = "europe";
const CREW = [
  "StackMember1#5418",
  "StackMember2#EUW",
  "StackMember3#EUW",
  "StackMember4#EUW",
  "StackMember5#EUW",
];

let last = 0;
async function riot(host, path) {
  const wait = Math.max(0, last + 80 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(`https://${host}.api.riotgames.com${path}`, { headers: { "X-Riot-Token": KEY } });
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? 5);
    console.log(`  429, wait ${retry}s`);
    await new Promise((r) => setTimeout(r, retry * 1000));
    return riot(host, path);
  }
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

await mkdir("packages/shared/fixtures/matches", { recursive: true });
const manifest = [];
for (const id of CREW) {
  const [name, tag] = id.split("#");
  try {
    const acc = await riot(REGIONAL, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
    manifest.push({ riotId: name, tag, region: PLATFORM, puuid: acc.puuid });
    console.log(`resolved ${id} -> ${acc.puuid.slice(0, 12)}...`);
  } catch (e) {
    console.log(`FAILED ${id}: ${e.message}`);
  }
}
await writeFile("spike/crew-manifest.json", JSON.stringify(manifest, null, 2));

// Find one ARAM match across the crew for a fixture.
let aramSaved = false;
for (const m of manifest) {
  if (aramSaved) break;
  try {
    const ids = await riot(REGIONAL, `/lol/match/v5/matches/by-puuid/${m.puuid}/ids?queue=450&count=2`);
    for (const mid of ids) {
      const match = await riot(REGIONAL, `/lol/match/v5/matches/${mid}`);
      await writeFile("packages/shared/fixtures/matches/aram.json", JSON.stringify(match, null, 2));
      console.log(`saved ARAM fixture ${mid} (${match.info.participants.length} players)`);
      aramSaved = true;
      break;
    }
  } catch (e) {
    console.log(`aram lookup failed for ${m.riotId}: ${e.message}`);
  }
}
if (!aramSaved) console.log("No ARAM match found across crew (ok, fixtures will cover 3 queues).");
console.log("Done. Manifest:", manifest.length, "members.");
