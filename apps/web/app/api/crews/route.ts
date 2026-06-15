import { NextResponse } from "next/server";
import { CreateCrewRequestSchema } from "@crewstats/shared";
import { getCurrentUser } from "@/lib/session";
import { createCrew, CrewError } from "@/lib/crews";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a stack." }, { status: 401 });

  // A signed-in user can't spin up unlimited stacks (each triggers backfills/Riot calls).
  if (!rateLimit(`crew-create:${user.id}`, 8, 60 * 60_000)) {
    return NextResponse.json({ error: "You've created a lot of stacks recently. Try again later." }, { status: 429 });
  }

  const parsed = CreateCrewRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the crew name and Riot ID." }, { status: 400 });

  try {
    const crew = await createCrew({
      name: parsed.data.name,
      riotId: parsed.data.riotId,
      region: parsed.data.region,
      userId: user.id,
    });
    return NextResponse.json({ ok: true, slug: crew.slug, inviteCode: crew.invite_code });
  } catch (err) {
    if (err instanceof CrewError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[api/crews] create failed:", err);
    return NextResponse.json({ error: "Could not create the crew." }, { status: 500 });
  }
}
