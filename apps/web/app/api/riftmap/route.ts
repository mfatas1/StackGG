import { NextResponse } from "next/server";
import { RIFT_MAP_URL } from "@/lib/format";

/**
 * Proxies Riot's official Summoner's Rift minimap (Data Dragon) so the WebGL
 * terrain can load it same-origin (no CORS taint). Data Dragon is Riot's public
 * CDN for third-party tools — the same source we use for champion/rank icons.
 */
export const revalidate = 86400;

export async function GET() {
  try {
    const r = await fetch(RIFT_MAP_URL, { next: { revalidate: 86400 } });
    if (!r.ok) return NextResponse.json({ error: "map unavailable" }, { status: 502 });
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "content-type": r.headers.get("content-type") ?? "image/png",
        "cache-control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "map unavailable" }, { status: 502 });
  }
}
