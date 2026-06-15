import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@crewstats/shared";
import { createMagicLink, deliverMagicLink } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const Body = z.object({ email: z.string().email(), redirectTo: z.string().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  // Throttle to stop email-bombing: per email and per IP.
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`magic:email:${email}`, 4, 15 * 60_000) || !rateLimit(`magic:ip:${clientIp(req)}`, 12, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again in a bit." }, { status: 429 });
  }

  const url = await createMagicLink(parsed.data.email, parsed.data.redirectTo ?? "/");
  try {
    await deliverMagicLink(parsed.data.email, url);
  } catch (err) {
    console.error("[auth] magic-link delivery failed:", (err as Error).message);
    return NextResponse.json({ error: "Couldn't send the email right now. Try again shortly." }, { status: 502 });
  }

  // Only echo the link back under console (dev) transport, so testing works without email.
  const devLink = env().MAGIC_LINK_TRANSPORT === "console" ? url : undefined;
  return NextResponse.json({ ok: true, devLink });
}
