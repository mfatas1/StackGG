import { NextResponse } from "next/server";
import { getPool, query } from "@crewstats/shared";

/**
 * Riot ID autocomplete over accounts StackGG already knows (riot_accounts).
 * Riot has no partial-name search endpoint, so this suggests from players we've
 * already seen — previously searched, crew members, ingested teammates. Prefix
 * match on the game name, most-recently-active first.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  // Support "name#tag" partial input: split on # if present.
  const hashIdx = q.indexOf("#");
  const namePart = hashIdx >= 0 ? q.slice(0, hashIdx) : q;
  const tagPart = hashIdx >= 0 ? q.slice(hashIdx + 1) : null;

  const rows = await query<{ riot_id: string; tag: string; region: string; profile_icon: number | null }>(
    `SELECT riot_id, tag, region, profile_icon
       FROM riot_accounts
      WHERE riot_id ILIKE $1
        ${tagPart ? "AND tag ILIKE $2" : ""}
      ORDER BY (riot_id ILIKE $${tagPart ? 3 : 2}) DESC, last_polled_at DESC NULLS LAST
      LIMIT 8`,
    tagPart
      ? [`${namePart}%`, `${tagPart}%`, namePart] // 3rd param: exact-prefix boost
      : [`${namePart}%`, namePart],
    getPool(),
  );

  return NextResponse.json({
    results: rows.map((r) => ({ riotId: r.riot_id, tag: r.tag, region: r.region, profileIcon: r.profile_icon })),
  });
}
