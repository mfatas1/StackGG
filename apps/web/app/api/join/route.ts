import { NextResponse } from "next/server";
import { JoinCrewRequestSchema } from "@crewstats/shared";
import { getCurrentUser } from "@/lib/session";
import { joinCrew, CrewError } from "@/lib/crews";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // Cap attempts per IP — with longer invite codes this makes brute-forcing infeasible.
  if (!rateLimit(`join:ip:${clientIp(req)}`, 12, 5 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const parsed = JoinCrewRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the invite code and Riot ID." }, { status: 400 });

  const user = await getCurrentUser(); // optional — joining doesn't require auth
  try {
    const crew = await joinCrew({
      inviteCode: parsed.data.inviteCode,
      riotId: parsed.data.riotId,
      region: parsed.data.region,
      userId: user?.id ?? null,
    });
    return NextResponse.json({ ok: true, slug: crew.slug });
  } catch (err) {
    if (err instanceof CrewError) {
      const status = err.code === "CREW_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[api/join] failed:", err);
    return NextResponse.json({ error: "Could not join the stack." }, { status: 500 });
  }
}
