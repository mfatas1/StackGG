import { NextResponse } from "next/server";
import { getMatchDetail } from "@/lib/match";

export const dynamic = "force-dynamic";

// Thin wrapper over the shared loader (see lib/match.ts). Returns the full lobby for the
// inline scoreboard; the standalone /match/[matchId] page uses the same loader directly.
export async function GET(_req: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;
  const data = await getMatchDetail(decodeURIComponent(matchId));
  if (!data) return NextResponse.json({ error: "Full game data unavailable." }, { status: 404 });
  return NextResponse.json(data);
}
