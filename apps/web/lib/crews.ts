import "server-only";
import {
  getPool,
  query,
  queryOne,
  withTransaction,
  slugify,
  generateInviteCode,
  resolveAndUpsertAccount,
  refreshAccountRanks,
  backfillMember,
  seasonStartDays,
  RiotApiError,
  type CrewRow,
  type DashboardConfig,
} from "@crewstats/shared";
import { enqueueBackfill, enqueuePollCrew, enqueueWeekly } from "./boss.js";

export class CrewError extends Error {
  constructor(
    public code: "RIOT_ID_NOT_FOUND" | "INVALID_INPUT" | "CREW_NOT_FOUND" | "ALREADY_MEMBER" | "RIOT_UNAVAILABLE",
    message: string,
  ) {
    super(message);
  }
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${generateInviteCode(4).toLowerCase()}`;
    const exists = await queryOne(`SELECT 1 FROM crews WHERE slug = $1`, [candidate]);
    if (!exists) return candidate;
  }
  return `${base}-${generateInviteCode(6).toLowerCase()}`;
}

async function uniqueInviteCode(): Promise<string> {
  // 14 chars over a 31-symbol alphabet ≈ 70 bits — not brute-forceable.
  for (let i = 0; i < 20; i++) {
    const code = generateInviteCode(14);
    const exists = await queryOne(`SELECT 1 FROM crews WHERE invite_code = $1`, [code]);
    if (!exists) return code;
  }
  return generateInviteCode(18);
}

async function memberPuuids(crewId: string): Promise<string[]> {
  const rows = await query<{ puuid: string }>(`SELECT puuid FROM crew_members WHERE crew_id = $1`, [crewId]);
  return rows.map((r) => r.puuid);
}

/** Resolve a Riot ID, persist the account, refresh ranks. Translates Riot 404. */
async function ensureAccount(riotId: string, region: string) {
  try {
    const account = await resolveAndUpsertAccount(riotId, region);
    try {
      await refreshAccountRanks(account.puuid, region);
    } catch {
      /* ranks are best-effort */
    }
    return account;
  } catch (err) {
    if (err instanceof RiotApiError && err.status === 404) {
      throw new CrewError("RIOT_ID_NOT_FOUND", `Riot ID "${riotId}" not found in ${region}.`);
    }
    if (err instanceof RiotApiError) {
      throw new CrewError("RIOT_UNAVAILABLE", "Riot API is temporarily unavailable. Try again shortly.");
    }
    throw err;
  }
}

/** Synchronous recent backfill so the dashboard shows data immediately. */
async function quickBackfill(puuid: string, region: string, tracked: Set<string>) {
  try {
    await backfillMember({ puuid, platform: region, recentOnlyPerQueue: 20, trackedPuuids: tracked, storeRaw: false });
  } catch (err) {
    console.warn(`[crews] quick backfill failed for ${puuid.slice(0, 10)}…: ${(err as Error).message}`);
  }
}

export async function createCrew(input: {
  name: string;
  riotId: string;
  region: string;
  userId: string;
}): Promise<CrewRow> {
  const account = await ensureAccount(input.riotId, input.region);
  const slug = await uniqueSlug(input.name);
  const inviteCode = await uniqueInviteCode();

  const crew = await withTransaction(async (client) => {
    const c = await queryOne<CrewRow>(
      `INSERT INTO crews (slug, name, invite_code, owner_user_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [slug, input.name, inviteCode, input.userId],
      client,
    );
    await client.query(
      `INSERT INTO crew_members (crew_id, puuid, role) VALUES ($1,$2,'owner')
       ON CONFLICT DO NOTHING`,
      [c!.id, account.puuid],
    );
    return c!;
  });

  // Link the owner's Riot account to their user so it shows under "my crews".
  await getPool().query(`UPDATE riot_accounts SET claimed_by_user_id = $2 WHERE puuid = $1`, [
    account.puuid,
    input.userId,
  ]);

  await quickBackfill(account.puuid, input.region, new Set([account.puuid]));
  await enqueueBackfill({ crewId: crew.id, puuid: account.puuid, platform: input.region, days: seasonStartDays() });
  await enqueueWeekly({ crewId: crew.id });
  return crew;
}

export async function joinCrew(input: {
  inviteCode: string;
  riotId: string;
  region: string;
  userId?: string | null;
}): Promise<CrewRow> {
  const crew = await queryOne<CrewRow>(`SELECT * FROM crews WHERE invite_code = $1`, [input.inviteCode]);
  if (!crew) throw new CrewError("CREW_NOT_FOUND", "That invite code is invalid or expired.");

  const account = await ensureAccount(input.riotId, input.region);

  const already = await queryOne(`SELECT 1 FROM crew_members WHERE crew_id = $1 AND puuid = $2`, [
    crew.id,
    account.puuid,
  ]);
  await getPool().query(
    `INSERT INTO crew_members (crew_id, puuid, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`,
    [crew.id, account.puuid],
  );

  // Link the joiner's Riot account to their user (if signed in) for "my crews".
  if (input.userId) {
    await getPool().query(`UPDATE riot_accounts SET claimed_by_user_id = $2 WHERE puuid = $1`, [
      account.puuid,
      input.userId,
    ]);
  }

  const tracked = new Set(await memberPuuids(crew.id));
  tracked.add(account.puuid);
  if (!already) await quickBackfill(account.puuid, input.region, tracked);

  await enqueueBackfill({ crewId: crew.id, puuid: account.puuid, platform: input.region, days: seasonStartDays() });
  await enqueuePollCrew({ crewId: crew.id });
  await enqueueWeekly({ crewId: crew.id });
  return crew;
}

export async function getCrewBySlug(slug: string): Promise<CrewRow | null> {
  return queryOne<CrewRow>(`SELECT * FROM crews WHERE slug = $1`, [slug]);
}

export interface UserCrew {
  slug: string;
  name: string;
  memberCount: number;
  isOwner: boolean;
}

/** Crews a user owns or is a member of (via a claimed Riot account). */
export async function getUserCrews(userId: string): Promise<UserCrew[]> {
  const rows = await query<{ slug: string; name: string; member_count: string; is_owner: boolean }>(
    `SELECT DISTINCT c.slug, c.name, c.created_at,
       (SELECT count(*) FROM crew_members cm2 WHERE cm2.crew_id = c.id)::text AS member_count,
       (c.owner_user_id = $1) AS is_owner
     FROM crews c
     LEFT JOIN crew_members cm ON cm.crew_id = c.id
     LEFT JOIN riot_accounts ra ON ra.puuid = cm.puuid AND ra.claimed_by_user_id = $1
     WHERE c.owner_user_id = $1 OR ra.claimed_by_user_id = $1
     ORDER BY c.created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    memberCount: Number(r.member_count),
    isOwner: r.is_owner,
  }));
}

export async function regenerateInviteCode(crewId: string): Promise<string> {
  const code = await uniqueInviteCode();
  await getPool().query(`UPDATE crews SET invite_code = $1 WHERE id = $2`, [code, crewId]);
  return code;
}

export async function renameCrew(crewId: string, name: string): Promise<void> {
  await getPool().query(`UPDATE crews SET name = $1 WHERE id = $2`, [name, crewId]);
}

export async function saveDashboardConfig(crewId: string, config: DashboardConfig): Promise<void> {
  await getPool().query(`UPDATE crews SET dashboard_config = $1::jsonb WHERE id = $2`, [JSON.stringify(config), crewId]);
}

/** Owner "reset to default" — clears the public layout so it falls back to DEFAULT_LAYOUT. */
export async function clearDashboardConfig(crewId: string): Promise<void> {
  await getPool().query(`UPDATE crews SET dashboard_config = NULL WHERE id = $1`, [crewId]);
}

/** A user's personal layout override for a stack (docs/competitive-casual-revamp.md), or null. */
export async function getUserDashboardConfig(crewId: string, userId: string): Promise<unknown | null> {
  const row = await queryOne<{ config: unknown }>(
    `SELECT config FROM dashboard_layouts WHERE crew_id = $1 AND user_id = $2`,
    [crewId, userId],
  );
  return row?.config ?? null;
}

export async function saveUserDashboardConfig(crewId: string, userId: string, config: DashboardConfig): Promise<void> {
  await getPool().query(
    `INSERT INTO dashboard_layouts (crew_id, user_id, config, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (crew_id, user_id) DO UPDATE SET config = EXCLUDED.config, updated_at = now()`,
    [crewId, userId, JSON.stringify(config)],
  );
}

export async function deleteUserDashboardConfig(crewId: string, userId: string): Promise<void> {
  await getPool().query(`DELETE FROM dashboard_layouts WHERE crew_id = $1 AND user_id = $2`, [crewId, userId]);
}

/**
 * A user may edit a stack's dashboard if they're the owner OR a member via a claimed Riot
 * account. Owners edit the public layout; members edit their personal override.
 */
export async function isCrewMember(crewId: string, userId: string): Promise<boolean> {
  const row = await queryOne(
    `SELECT 1 FROM crews c
      WHERE c.id = $1
        AND (c.owner_user_id = $2
             OR EXISTS (SELECT 1 FROM crew_members cm
                          JOIN riot_accounts ra ON ra.puuid = cm.puuid
                         WHERE cm.crew_id = c.id AND ra.claimed_by_user_id = $2))`,
    [crewId, userId],
  );
  return !!row;
}

export async function removeMember(crewId: string, puuid: string): Promise<void> {
  await getPool().query(`DELETE FROM crew_members WHERE crew_id = $1 AND puuid = $2 AND role <> 'owner'`, [
    crewId,
    puuid,
  ]);
}

export async function deleteCrew(crewId: string): Promise<void> {
  await getPool().query(`DELETE FROM crews WHERE id = $1`, [crewId]);
}

export async function isCrewOwner(crewId: string, userId: string): Promise<boolean> {
  const row = await queryOne(`SELECT 1 FROM crews WHERE id = $1 AND owner_user_id = $2`, [crewId, userId]);
  return !!row;
}
