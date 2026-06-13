import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getCrewBySlug, isCrewOwner, removeMember } from "@/lib/crews";

export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const puuid = new URL(req.url).searchParams.get("puuid");
  if (!puuid) return NextResponse.json({ error: "Missing puuid." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const crew = await getCrewBySlug(slug);
  if (!crew) return NextResponse.json({ error: "Crew not found." }, { status: 404 });
  if (!(await isCrewOwner(crew.id, user.id)))
    return NextResponse.json({ error: "Only the crew owner can do that." }, { status: 403 });

  await removeMember(crew.id, puuid);
  return NextResponse.json({ ok: true });
}
