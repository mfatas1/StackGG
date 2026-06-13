import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getCrewBySlug, isCrewOwner, regenerateInviteCode } from "@/lib/crews";

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const crew = await getCrewBySlug(slug);
  if (!crew) return NextResponse.json({ error: "Crew not found." }, { status: 404 });
  if (!(await isCrewOwner(crew.id, user.id)))
    return NextResponse.json({ error: "Only the crew owner can do that." }, { status: 403 });

  const inviteCode = await regenerateInviteCode(crew.id);
  return NextResponse.json({ ok: true, inviteCode });
}
