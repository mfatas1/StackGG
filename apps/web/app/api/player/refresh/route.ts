import { NextResponse } from "next/server";
import {
  resolveAndUpsertAccount,
  refreshAccountRanks,
  backfillMember,
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

  // Pull new games right here in the request — incremental, so it stops as soon as it
  // reaches already-stored history (usually just a few new games). Doing it inline
  // means Refresh works immediately and does NOT depend on the background worker being
  // up. `days` is only a floor so a never-fully-synced profile can't page past the season.
  try {
    const res = await backfillMember({
      puuid,
      platform: region,
      days: seasonStartDays(),
      incremental: true,
      storeRaw: true,
    });
    return NextResponse.json({ ok: true, fetched: res.fetched });
  } catch (err) {
    // If the live pull dies partway (e.g. a transient Riot error), fall back to the
    // background job so the refresh still eventually catches up.
    console.warn(`[refresh] inline pull failed for ${puuid.slice(0, 10)}…: ${(err as Error).message}`);
    await enqueueBackfill({ puuid, platform: region, days: seasonStartDays(), incremental: true });
    return NextResponse.json({ ok: true, fetched: 0 });
  }
}
