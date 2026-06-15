import { NextResponse } from "next/server";
import { getCrewBySlug } from "@/lib/crews";
import { enqueuePollCrew } from "@/lib/boss";
import { rateLimit, clientIp } from "@/lib/ratelimit";

/**
 * Queue an immediate poll for fresh matches. Open to any member (no sign-in) but rate
 * limited so it can't be abused to burn the Riot API budget: at most once per 20s per
 * crew, plus a per-IP cap so one client can't hammer many crews.
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

  await enqueuePollCrew({ crewId: crew.id });
  return NextResponse.json({ ok: true });
}
