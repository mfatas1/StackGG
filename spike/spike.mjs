// M0 spike — verify Riot match data for ARAM, Arena, ranked, flex.
// Usage:
//   RIOT_KEY=RGAPI-xxxx node spike/spike.mjs "YourName#TAG" euw1
// Requires Node 18+. Saves one full match JSON per queue into ./spike-out/
// and prints a field summary so you can eyeball what's available.

const [riotId, platform = "euw1"] = process.argv.slice(2);
const KEY = process.env.RIOT_KEY;
if (!KEY || !riotId?.includes("#")) {
  console.error('Usage: RIOT_KEY=RGAPI-xxxx node spike/spike.mjs "Name#TAG" [platform]');
  process.exit(1);
}

const REGIONAL = { euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas",
  kr: "asia", jp1: "asia", oc1: "sea" }[platform] ?? "europe";

const QUEUES = { 450: "aram", 1700: "arena", 420: "ranked_solo", 440: "ranked_flex" };

let lastCall = 0;
async function riot(host, path) {
  const wait = Math.max(0, lastCall + 60 - Date.now()); // crude ~16 req/s cap
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(`https://${host}.api.riotgames.com${path}`, {
    headers: { "X-Riot-Token": KEY },
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? 10);
    console.log(`  rate limited, waiting ${retry}s...`);
    await new Promise(r => setTimeout(r, retry * 1000));
    return riot(host, path);
  }
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

const [name, tag] = riotId.split("#");
const account = await riot(REGIONAL, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
console.log(`PUUID: ${account.puuid}\n`);

const { mkdir, writeFile } = await import("fs/promises");
await mkdir("spike-out", { recursive: true });

for (const [queue, label] of Object.entries(QUEUES)) {
  const ids = await riot(REGIONAL, `/lol/match/v5/matches/by-puuid/${account.puuid}/ids?queue=${queue}&count=3`);
  console.log(`queue ${queue} (${label}): ${ids.length} recent match(es)`);
  if (!ids.length) continue;

  const match = await riot(REGIONAL, `/lol/match/v5/matches/${ids[0]}`);
  await writeFile(`spike-out/${label}.json`, JSON.stringify(match, null, 2));

  const me = match.info.participants.find(p => p.puuid === account.puuid);
  console.log(`  saved spike-out/${label}.json  (${match.info.participants.length} participants)`);
  console.log(`  you: ${me.championName} ${me.kills}/${me.deaths}/${me.assists}` +
    (queue === "1700"
      ? `  subteam=${me.playerSubteamId} placement=${me.subteamPlacement} augments=[${[me.playerAugment1, me.playerAugment2, me.playerAugment3, me.playerAugment4].filter(Boolean).join(",")}]`
      : `  win=${me.win} team=${me.teamId}`));
  console.log(`  participant fields available: ${Object.keys(me).length}`);
}

console.log("\nDone. Open the JSONs in spike-out/ and check:");
console.log("  1. ARAM has the full standard participant schema");
console.log("  2. Arena has playerSubteamId / subteamPlacement / augment IDs");
console.log("  3. Every participant in a match is in one payload (dedup works)");
