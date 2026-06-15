import { getPool, queryOne, type Queryable } from "./db.js";
import { getRiotClient, RiotApiError } from "./riot/client.js";
import { parseRiotId, type RankInfo, type RiotAccountRow } from "./contracts.js";

/**
 * Account resolution + rank refresh. Lives in shared because both the worker
 * (ingestion) and the web app (crew create/join, snapshot) need it, and both
 * must go through the single RiotClient (PLAN hard rule #2).
 */

export async function getAccountRow(puuid: string, db: Queryable = getPool()): Promise<RiotAccountRow | null> {
  return queryOne<RiotAccountRow>(`SELECT * FROM riot_accounts WHERE puuid = $1`, [puuid], db);
}

export async function findAccountByRiotId(
  name: string,
  tag: string,
  db: Queryable = getPool(),
): Promise<RiotAccountRow | null> {
  return queryOne<RiotAccountRow>(
    `SELECT * FROM riot_accounts WHERE lower(riot_id) = lower($1) AND lower(tag) = lower($2)`,
    [name, tag],
    db,
  );
}

/**
 * Resolve a Riot ID to a PUUID via account-v1 and upsert the riot_accounts row.
 * Returns the stored row. Throws RiotApiError(404) if the Riot ID doesn't exist.
 */
export async function resolveAndUpsertAccount(
  riotId: string,
  platform: string,
  db: Queryable = getPool(),
): Promise<RiotAccountRow> {
  const parsed = parseRiotId(riotId);
  if (!parsed) throw new Error(`Invalid Riot ID: "${riotId}" (expected name#tag)`);

  // DB-first: a Riot ID → PUUID mapping is stable, so skip the rate-limited account-v1
  // call when we already have a (non-stale) row. A rename simply misses here and falls
  // through to Riot. This removes one Riot call from every snapshot/crew page load.
  const cached = await findAccountByRiotId(parsed.name, parsed.tag, db);
  if (cached && !cached.is_stale) return cached;

  const client = getRiotClient();
  const account = await client.getAccountByRiotId(parsed.name, parsed.tag, platform);

  const gameName = account.gameName ?? parsed.name;
  const tagLine = account.tagLine ?? parsed.tag;

  const row = await queryOne<RiotAccountRow>(
    `INSERT INTO riot_accounts (puuid, riot_id, tag, region)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (puuid) DO UPDATE SET riot_id = EXCLUDED.riot_id, tag = EXCLUDED.tag, is_stale = false
     RETURNING *`,
    [account.puuid, gameName, tagLine, platform],
    db,
  );
  return row!;
}

const QUEUE_TO_RANK: Record<string, "rank_solo" | "rank_flex"> = {
  RANKED_SOLO_5x5: "rank_solo",
  RANKED_FLEX_SR: "rank_flex",
};

/** Fetch summoner (profile icon) + league entries (tier/LP) and persist them. */
export async function refreshAccountRanks(puuid: string, platform: string, db: Queryable = getPool()): Promise<void> {
  const client = getRiotClient();
  let profileIcon: number | null = null;
  let summonerId: string | null = null;
  let rankSolo: RankInfo | null = null;
  let rankFlex: RankInfo | null = null;

  // Summoner (icon) and league entries (rank) are independent — fetch in parallel.
  const [summonerRes, entriesRes] = await Promise.allSettled([
    client.getSummonerByPuuid(puuid, platform),
    client.getLeagueEntriesByPuuid(puuid, platform),
  ]);

  if (summonerRes.status === "fulfilled") {
    profileIcon = summonerRes.value.profileIconId ?? null;
    summonerId = summonerRes.value.id ?? null;
  } else if (!(summonerRes.reason instanceof RiotApiError && summonerRes.reason.status === 404)) {
    throw summonerRes.reason;
  }

  if (entriesRes.status === "fulfilled") {
    for (const e of entriesRes.value) {
      const target = QUEUE_TO_RANK[e.queueType];
      const info: RankInfo = { tier: e.tier, rank: e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses };
      if (target === "rank_solo") rankSolo = info;
      else if (target === "rank_flex") rankFlex = info;
    }
  } else if (!(entriesRes.reason instanceof RiotApiError && entriesRes.reason.status === 404)) {
    throw entriesRes.reason;
  }

  await db.query(
    `UPDATE riot_accounts
       SET profile_icon = COALESCE($2, profile_icon),
           summoner_id = COALESCE($3, summoner_id),
           rank_solo = $4, rank_flex = $5
     WHERE puuid = $1`,
    [puuid, profileIcon, summonerId, rankSolo ? JSON.stringify(rankSolo) : null, rankFlex ? JSON.stringify(rankFlex) : null] as never[],
  );
}
