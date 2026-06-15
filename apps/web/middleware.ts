import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CSRF defense for the API: a cross-site page can't read our cookies, but with
 * SameSite=lax it can still drive some credentialed state-changing requests. So for
 * any mutating method we require the browser-supplied Origin to match the host the
 * request was sent to (same-origin). Requests with no Origin (non-browser clients,
 * top-level navigations) are allowed; only a *mismatched* Origin is rejected.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(req: NextRequest) {
  if (MUTATING.has(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      const host = req.headers.get("host");
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = null;
      }
      if (!host || originHost !== host) {
        return NextResponse.json({ error: "Bad request origin." }, { status: 403 });
      }
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
