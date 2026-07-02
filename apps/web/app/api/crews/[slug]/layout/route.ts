import { NextResponse } from "next/server";
import { z } from "zod";
import { DashboardConfigSchema } from "@crewstats/shared";
import { getCurrentUser } from "@/lib/session";
import {
  getCrewBySlug,
  isCrewMember,
  saveDashboardConfig,
  clearDashboardConfig,
  saveUserDashboardConfig,
  deleteUserDashboardConfig,
} from "@/lib/crews";

/**
 * Personal/public dashboard layout (docs/competitive-casual-revamp.md). Any signed-in member
 * may edit: the owner writes the stack's public layout (crews.dashboard_config); everyone else
 * writes their personal override (dashboard_layouts). Reset clears the relevant layer.
 */
async function requireMember(slug: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const crew = await getCrewBySlug(slug);
  if (!crew) return { error: NextResponse.json({ error: "Stack not found." }, { status: 404 }) };
  if (!(await isCrewMember(crew.id, user.id)))
    return { error: NextResponse.json({ error: "Only stack members can do that." }, { status: 403 }) };
  return { crew, user, isOwner: crew.owner_user_id === user.id };
}

const PutBody = z.object({ config: DashboardConfigSchema });

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const auth = await requireMember(slug);
  if (auth.error) return auth.error;
  const parsed = PutBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid layout." }, { status: 400 });

  if (auth.isOwner) await saveDashboardConfig(auth.crew.id, parsed.data.config);
  else await saveUserDashboardConfig(auth.crew.id, auth.user.id, parsed.data.config);
  return NextResponse.json({ ok: true, scope: auth.isOwner ? "public" : "personal" });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const auth = await requireMember(slug);
  if (auth.error) return auth.error;

  if (auth.isOwner) await clearDashboardConfig(auth.crew.id);
  else await deleteUserDashboardConfig(auth.crew.id, auth.user.id);
  return NextResponse.json({ ok: true });
}
