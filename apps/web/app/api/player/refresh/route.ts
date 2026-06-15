import { NextResponse } from "next/server";
import {
  resolveAndUpsertAccount,
  refreshAccountRanks,
  seasonStartDays,
  parseRiotId,
  RiotApiError,
} from "@crewstats/shared";
import { enqueueBackfill } from "@/lib/boss";
import { rateLimit, clientIp } from "@/lib/ratelimit";

/**
 * Update a single profile on demand: an incremental sync that pulls *every* new game
 * since the last time, then stops once it reaches already-stored history (however
 * many that is — no fixed window). Bypasses the 30-minute freshness window in
 * getOrBuildSnapshot. Used by the "Refresh" button. Rate limited so it can't be used
 * to burn the Riot API budget.
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
  // incremental = catch up new games until we hit stored history; days is only a floor
  // so a never-fully-synced profile can't page back past the season.
  await enqueueBackfill({ puuid, platform: region, days: seasonStartDays(), incremental: true });
  return NextResponse.json({ ok: true });
}
