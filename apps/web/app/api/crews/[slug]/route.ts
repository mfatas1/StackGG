import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getCrewBySlug, isCrewOwner, renameCrew, deleteCrew } from "@/lib/crews";

async function requireOwner(slug: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const crew = await getCrewBySlug(slug);
  if (!crew) return { error: NextResponse.json({ error: "Crew not found." }, { status: 404 }) };
  if (!(await isCrewOwner(crew.id, user.id)))
    return { error: NextResponse.json({ error: "Only the stack owner can do that." }, { status: 403 }) };
  return { crew };
}

const PatchBody = z.object({ name: z.string().min(1).max(60) });

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const auth = await requireOwner(slug);
  if (auth.error) return auth.error;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
  await renameCrew(auth.crew.id, parsed.data.name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const auth = await requireOwner(slug);
  if (auth.error) return auth.error;
  await deleteCrew(auth.crew.id);
  return NextResponse.json({ ok: true });
}
