import { NextResponse } from "next/server";
import {
  resolveAndUpsertAccount,
  refreshAccountRanks,
  parseRiotId,
  RiotApiError,
} from "@crewstats/shared";
import { enqueueBackfill } from "@/lib/boss";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// "Refresh" = pull just the games you've played recently, not the whole season.
// Listing this short window is a handful of calls, and dedup skips anything already
// stored, so only genuinely new matches get fetched. The full-season backfill still
// runs on its own (a stale profile visit), so this only needs to catch up new games.
const REFRESH_DAYS = 7;

/**
 * Pull a single profile's recent games on demand, bypassing the 30-minute freshness
 * window in getOrBuildSnapshot. Used by the "Refresh" button. Rate limited so it
 * can't be used to burn the Riot API budget.
 */
export async function POST(req: Request) {
  let body: { riotId?: string; region?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { riotId, region } = body;
  if (!riotId || !region || !parseRiotId(riotId)) {
    return NextResponse.json({ error: "Enter a Riot ID like Name#TAG." }, { status: 400 });
  }

  if (!rateLimit(`prefresh:ip:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Slow down — too many refreshes." }, { status: 429 });
  }

  let puuid: string;
  try {
    const account = await resolveAndUpsertAccount(riotId, region);
    puuid = account.puuid;
  } catch (err) {
    if (err instanceof RiotApiError && err.status === 404) {
      return NextResponse.json({ error: `Riot ID "${riotId}" not found in ${region}.` }, { status: 404 });
    }
    return NextResponse.json({ error: "Riot API is temporarily unavailable." }, { status: 502 });
  }

  // Per-profile cap: at most one forced re-pull every 30s.
  if (!rateLimit(`prefresh:puuid:${puuid}`, 1, 30_000)) {
    return NextResponse.json({ error: "Just refreshed — give it a moment." }, { status: 429 });
  }

  await refreshAccountRanks(puuid, region).catch(() => {});
  await enqueueBackfill({ puuid, platform: region, days: REFRESH_DAYS });
  return NextResponse.json({ ok: true });
}
