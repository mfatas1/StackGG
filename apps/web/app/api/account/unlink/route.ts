import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { unclaimRiotAccount } from "@/lib/account";

/** Unlink a Riot account from the signed-in user. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { puuid?: string } | null;
  if (!body?.puuid) return NextResponse.json({ error: "Missing account." }, { status: 400 });

  await unclaimRiotAccount(user.id, body.puuid);
  return NextResponse.json({ ok: true });
}
