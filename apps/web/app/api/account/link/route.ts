import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { claimRiotAccount, AccountError } from "@/lib/account";
import { rateLimit, clientIp } from "@/lib/ratelimit";

/** Link a Riot ID to the signed-in user. */
export async function POST(req: Request) {
  if (!rateLimit(`link:ip:${clientIp(req)}`, 10, 5 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { riotId?: string; region?: string } | null;
  if (!body?.riotId || !body?.region) {
    return NextResponse.json({ error: "Enter a Riot ID like Name#TAG." }, { status: 400 });
  }

  try {
    const account = await claimRiotAccount(user.id, body.riotId, body.region);
    return NextResponse.json({ ok: true, riotId: account.riot_id, tag: account.tag });
  } catch (err) {
    if (err instanceof AccountError) {
      const status = err.code === "NOT_FOUND" ? 404 : err.code === "TAKEN" ? 409 : err.code === "RIOT_UNAVAILABLE" ? 502 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[api/account/link] failed:", err);
    return NextResponse.json({ error: "Could not link that account." }, { status: 500 });
  }
}
