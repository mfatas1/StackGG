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
  RiotApiError,
  type CrewRow,
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
  for (let i = 0; i < 20; i++) {
    const code = generateInviteCode(8);
    const exists = await queryOne(`SELECT 1 FROM crews WHERE invite_code = $1`, [code]);
    if (!exists) return code;
  }
  return generateInviteCode(12);
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

  await quickBackfill(account.puuid, input.region, new Set([account.puuid]));
  await enqueueBackfill({ crewId: crew.id, puuid: account.puuid, platform: input.region, days: 90 });
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

  const tracked = new Set(await memberPuuids(crew.id));
  tracked.add(account.puuid);
  if (!already) await quickBackfill(account.puuid, input.region, tracked);

  await enqueueBackfill({ crewId: crew.id, puuid: account.puuid, platform: input.region, days: 90 });
  await enqueuePollCrew({ crewId: crew.id });
  await enqueueWeekly({ crewId: crew.id });
  return crew;
}

export async function getCrewBySlug(slug: string): Promise<CrewRow | null> {
  return queryOne<CrewRow>(`SELECT * FROM crews WHERE slug = $1`, [slug]);
}

export async function regenerateInviteCode(crewId: string): Promise<string> {
  const code = await uniqueInviteCode();
  await getPool().query(`UPDATE crews SET invite_code = $1 WHERE id = $2`, [code, crewId]);
  return code;
}

export async function renameCrew(crewId: string, name: string): Promise<void> {
  await getPool().query(`UPDATE crews SET name = $1 WHERE id = $2`, [name, crewId]);
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
