import { NextResponse } from "next/server";
import { getCrewBySlug } from "@/lib/crews";
import { enqueuePollCrew } from "@/lib/boss";

/** Queue an immediate poll for fresh matches (any crew member can trigger). */
export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const crew = await getCrewBySlug(slug);
  if (!crew) return NextResponse.json({ error: "Crew not found." }, { status: 404 });
  await enqueuePollCrew({ crewId: crew.id });
  return NextResponse.json({ ok: true });
}
