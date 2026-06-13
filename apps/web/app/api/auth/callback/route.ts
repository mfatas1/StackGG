import { NextResponse } from "next/server";
import { consumeMagicLink, setSessionCookie } from "@/lib/session";
import { env } from "@crewstats/shared";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const base = env().NEXT_PUBLIC_BASE_URL;
  if (!token) return NextResponse.redirect(`${base}/?auth=invalid`);

  const result = await consumeMagicLink(token);
  if (!result) return NextResponse.redirect(`${base}/?auth=expired`);

  await setSessionCookie(result.sessionId);
  const dest = result.redirectTo.startsWith("/") ? `${base}${result.redirectTo}` : base;
  return NextResponse.redirect(dest);
}
