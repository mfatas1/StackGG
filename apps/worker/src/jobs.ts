import { getPool, query, isoWeek } from "@crewstats/shared";
import type {
  BackfillMemberJob,
  PollCrewJob,
  RefreshRanksJob,
  ComputeWeeklySnapshotJob,
} from "@crewstats/shared";
import { getCrewDashboard } from "@crewstats/stats";
import { backfillMember, pollMember, refreshAccountRanks } from "./ingest.js";

interface CrewMember {
  puuid: string;
  region: string;
}

async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  return query<CrewMember>(
    `SELECT cm.puuid, COALESCE(ra.region, 'euw1') AS region
       FROM crew_members cm JOIN riot_accounts ra ON ra.puuid = cm.puuid
      WHERE cm.crew_id = $1`,
    [crewId],
  );
}

export async function handleBackfillMember(data: BackfillMemberJob): Promise<void> {
  const platform = data.platform;
  let tracked: Set<string> | undefined;
  // Always keep the full match payload (matches.raw) so the match-history "full lobby"
  // view can be served straight from the DB, with no live Riot request / API key.
  const storeRaw = true;
  if (data.crewId) {
    const members = await getCrewMembers(data.crewId);
    tracked = new Set(members.map((m) => m.puuid));
    tracked.add(data.puuid);
  }
  const res = await backfillMember({ puuid: data.puuid, platform, days: data.days ?? 90, trackedPuuids: tracked, storeRaw });
  console.log(`[backfill] ${data.puuid.slice(0, 10)}… fetched ${res.fetched}/${res.candidateMatchIds} matches, ${res.participantsWritten} rows`);
  try {
    await refreshAccountRanks(data.puuid, platform);
  } catch (err) {
    console.warn(`[backfill] rank refresh failed for ${data.puuid.slice(0, 10)}…: ${(err as Error).message}`);
  }
}

export async function handlePollCrew(data: PollCrewJob): Promise<void> {
  const members = await getCrewMembers(data.crewId);
  const tracked = new Set(members.map((m) => m.puuid));
  for (const m of members) {
    try {
      const res = await pollMember({ puuid: m.puuid, platform: m.region, trackedPuuids: tracked });
      if (res.fetched) console.log(`[poll] ${m.puuid.slice(0, 10)}… +${res.fetched} new matches`);
      await refreshAccountRanks(m.puuid, m.region);
    } catch (err) {
      console.warn(`[poll] failed for ${m.puuid.slice(0, 10)}…: ${(err as Error).message}`);
    }
  }
}

export async function handlePollAll(): Promise<string[]> {
  const crews = await query<{ id: string }>(`SELECT id FROM crews`);
  return crews.map((c) => c.id);
}

export async function handleRefreshRanks(data: RefreshRanksJob): Promise<void> {
  await refreshAccountRanks(data.puuid, data.platform);
}

export async function handleComputeWeeklySnapshot(data: ComputeWeeklySnapshotJob): Promise<void> {
  const dashboard = await getCrewDashboard(getPool(), data.crewId, "all");
  if (!dashboard) return;
  const period = isoWeek(new Date());
  await getPool().query(
    `INSERT INTO stat_snapshots (crew_id, period, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (crew_id, period) DO UPDATE SET payload = EXCLUDED.payload, created_at = now()`,
    [data.crewId, period, JSON.stringify(dashboard)],
  );
  console.log(`[weekly] snapshot stored for crew ${data.crewId} (${period})`);
}
