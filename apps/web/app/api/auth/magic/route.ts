import { NextResponse } from "next/server";
import { z } from "zod";
import { createMagicLink, deliverMagicLink } from "@/lib/session";

const Body = z.object({ email: z.string().email(), redirectTo: z.string().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const url = await createMagicLink(parsed.data.email, parsed.data.redirectTo ?? "/");
  await deliverMagicLink(parsed.data.email, url);

  // In console transport (dev), also return the link so the flow is testable.
  const devLink = process.env.MAGIC_LINK_TRANSPORT !== "smtp" ? url : undefined;
  return NextResponse.json({ ok: true, devLink });
}
