import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  query,
  resolveAndUpsertAccount,
  refreshAccountRanks,
  backfillMember,
  seasonStartDays,
} from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { enqueuePollCrew } from "@/lib/boss";
import { rateLimit, clientIp } from "@/lib/ratelimit";

/**
 * Pull new games for the whole stack on demand. Like the profile Refresh button, this
 * does the work INLINE (an incremental sync per member that stops at already-stored
 * history) rather than only queuing a worker job — so new games show up immediately and
 * it doesn't depend on the background worker being up. Re-resolving each member also
 * heals any PUUID that changed after a Riot key rotation. Open to any member (no
 * sign-in) but rate limited so it can't be abused to burn the Riot API budget.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const crew = await getCrewBySlug(slug);
  if (!crew) return NextResponse.json({ error: "Crew not found." }, { status: 404 });

  if (!rateLimit(`refresh:ip:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Slow down — too many refreshes." }, { status: 429 });
  }
  if (!rateLimit(`refresh:crew:${crew.id}`, 1, 20_000)) {
    return NextResponse.json({ error: "Just refreshed — give it a moment." }, { status: 429 });
  }

  try {
    const members = await query<{ puuid: string; riot_id: string; tag: string; region: string }>(
      `SELECT ra.puuid, ra.riot_id, ra.tag, COALESCE(ra.region, 'euw1') AS region
         FROM crew_members cm JOIN riot_accounts ra ON ra.puuid = cm.puuid
        WHERE cm.crew_id = $1`,
      [crew.id],
    );

    // Re-resolve every member first (heals a changed PUUID, cheap once non-stale) so we
    // track the current PUUIDs — shared games then persist for the whole stack at once.
    const resolved: { puuid: string; region: string }[] = [];
    for (const m of members) {
      try {
        const row = await resolveAndUpsertAccount(`${m.riot_id}#${m.tag}`, m.region);
        resolved.push({ puuid: row.puuid, region: m.region });
      } catch {
        resolved.push({ puuid: m.puuid, region: m.region });
      }
    }
    const tracked = new Set(resolved.map((r) => r.puuid));

    let fetched = 0;
    for (const r of resolved) {
      try {
        const res = await backfillMember({
          puuid: r.puuid,
          platform: r.region,
          days: seasonStartDays(),
          incremental: true,
          storeRaw: true,
          trackedPuuids: tracked,
        });
        fetched += res.fetched;
        await refreshAccountRanks(r.puuid, r.region).catch(() => {});
      } catch (err) {
        console.warn(`[crew-refresh] member ${r.puuid.slice(0, 10)}… failed: ${(err as Error).message}`);
      }
    }

    // Drop the cached dashboard so the next load re-reads the freshly stored games.
    revalidateTag(`crew:${crew.id}`);
    return NextResponse.json({ ok: true, fetched });
  } catch (err) {
    // If the inline pull can't run at all, fall back to the background worker poll.
    console.warn(`[crew-refresh] inline pull failed for ${crew.id}: ${(err as Error).message}`);
    await enqueuePollCrew({ crewId: crew.id }).catch(() => {});
    revalidateTag(`crew:${crew.id}`);
    return NextResponse.json({ ok: true, fetched: 0 });
  }
}
