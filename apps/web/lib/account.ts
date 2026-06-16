import "server-only";
import {
  getPool,
  query,
  queryOne,
  resolveAndUpsertAccount,
  refreshAccountRanks,
  seasonStartDays,
  parseRiotId,
  RiotApiError,
} from "@crewstats/shared";
import type { RankInfo, RiotAccountRow } from "@crewstats/shared";
import { enqueueBackfill } from "./boss.js";

/**
 * Linking ("claiming") a Riot account to the signed-in user — the first-class version
 * of what crew create/join does as a side effect. Trust-based for now (we believe the
 * Riot ID you enter); RSO would later verify ownership. Reuses resolveAndUpsertAccount,
 * so the same DB-first → Riot fallback path applies.
 */
export class AccountError extends Error {
  constructor(
    public code: "INVALID" | "NOT_FOUND" | "TAKEN" | "RIOT_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "AccountError";
  }
}

export interface ClaimedAccount {
  puuid: string;
  riotId: string;
  tag: string;
  region: string;
  profileIcon: number | null;
  rankSolo: RankInfo | null;
  rankFlex: RankInfo | null;
}

/** The Riot accounts a user has linked. */
export async function getClaimedAccounts(userId: string): Promise<ClaimedAccount[]> {
  const rows = await query<{
    puuid: string;
    riot_id: string;
    tag: string;
    region: string;
    profile_icon: number | null;
    rank_solo: RankInfo | null;
    rank_flex: RankInfo | null;
  }>(
    `SELECT puuid, riot_id, tag, COALESCE(region, 'euw1') AS region, profile_icon, rank_solo, rank_flex
       FROM riot_accounts WHERE claimed_by_user_id = $1 ORDER BY lower(riot_id)`,
    [userId],
  );
  return rows.map((r) => ({
    puuid: r.puuid,
    riotId: r.riot_id,
    tag: r.tag,
    region: r.region,
    profileIcon: r.profile_icon,
    rankSolo: r.rank_solo,
    rankFlex: r.rank_flex,
  }));
}

/** Link a Riot ID to the given user. Idempotent if already theirs; refuses if another
 *  user already linked it. Kicks off a season backfill so their profile fills in. */
export async function claimRiotAccount(userId: string, riotId: string, region: string): Promise<RiotAccountRow> {
  if (!parseRiotId(riotId)) throw new AccountError("INVALID", "Enter a Riot ID like Name#TAG.");

  let account: RiotAccountRow;
  try {
    account = await resolveAndUpsertAccount(riotId, region);
  } catch (err) {
    if (err instanceof RiotApiError && err.status === 404) {
      throw new AccountError("NOT_FOUND", `Riot ID "${riotId}" not found in ${region}.`);
    }
    throw new AccountError("RIOT_UNAVAILABLE", "Riot API is temporarily unavailable — try again.");
  }

  const existing = await queryOne<{ claimed_by_user_id: string | null }>(
    `SELECT claimed_by_user_id FROM riot_accounts WHERE puuid = $1`,
    [account.puuid],
  );
  if (existing?.claimed_by_user_id && existing.claimed_by_user_id !== userId) {
    throw new AccountError("TAKEN", "That Riot account is already linked to another StackGG account.");
  }

  await getPool().query(`UPDATE riot_accounts SET claimed_by_user_id = $2 WHERE puuid = $1`, [account.puuid, userId]);

  // Make sure their stats are present/fresh once linked.
  await refreshAccountRanks(account.puuid, region).catch(() => {});
  await enqueueBackfill({ puuid: account.puuid, platform: region, days: seasonStartDays() });
  return account;
}

/** Unlink an account the user previously claimed (only their own claim is cleared). */
export async function unclaimRiotAccount(userId: string, puuid: string): Promise<void> {
  await getPool().query(`UPDATE riot_accounts SET claimed_by_user_id = NULL WHERE puuid = $1 AND claimed_by_user_id = $2`, [
    puuid,
    userId,
  ]);
}
