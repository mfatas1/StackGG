import "server-only";
import { query } from "@crewstats/shared";
import { getCurrentUser } from "./session.js";
import { getClaimedAccounts } from "./account.js";

export type ViewerTier = "self" | "stackmate" | "stranger";

export interface ViewerRelation {
  tier: ViewerTier;
  /** the signed-in viewer's own linked puuids */
  viewerPuuids: string[];
  /** every puuid in the stacks the viewer shares with the viewed player (for highlighting) */
  sharedCrewPuuids: string[];
  sharedCrews: { slug: string; name: string }[];
}

const STRANGER: ViewerRelation = { tier: "stranger", viewerPuuids: [], sharedCrewPuuids: [], sharedCrews: [] };

/**
 * How the signed-in viewer relates to the profile being viewed:
 *  - self: the viewed account is one of the viewer's linked Riot accounts
 *  - stackmate: the viewer shares at least one stack with the viewed player
 *  - stranger: not signed in, or no relationship
 */
export async function getViewerRelation(viewedPuuid: string): Promise<ViewerRelation> {
  const user = await getCurrentUser();
  if (!user) return STRANGER;

  const viewerPuuids = (await getClaimedAccounts(user.id)).map((a) => a.puuid);
  if (viewerPuuids.includes(viewedPuuid)) {
    return { tier: "self", viewerPuuids, sharedCrewPuuids: [], sharedCrews: [] };
  }
  if (!viewerPuuids.length) return STRANGER;

  // Stacks where both the viewed player and one of the viewer's accounts are members.
  const crews = await query<{ id: string; slug: string; name: string }>(
    `SELECT DISTINCT c.id, c.slug, c.name
       FROM crews c
       JOIN crew_members viewed ON viewed.crew_id = c.id AND viewed.puuid = $1
       JOIN crew_members mine   ON mine.crew_id = c.id AND mine.puuid = ANY($2::text[])`,
    [viewedPuuid, viewerPuuids],
  );
  if (!crews.length) return STRANGER;

  const members = await query<{ puuid: string }>(
    `SELECT DISTINCT puuid FROM crew_members WHERE crew_id = ANY($1::uuid[])`,
    [crews.map((c) => c.id)],
  );
  return {
    tier: "stackmate",
    viewerPuuids,
    sharedCrewPuuids: members.map((m) => m.puuid),
    sharedCrews: crews.map((c) => ({ slug: c.slug, name: c.name })),
  };
}

/** Together-record: distinct SR games where the viewed player and any of the viewer's
 *  accounts were on the same team. */
export async function getDuoRecord(viewerPuuids: string[], viewedPuuid: string): Promise<{ games: number; wins: number }> {
  if (!viewerPuuids.length) return { games: 0, wins: 0 };
  const rows = await query<{ games: number; wins: number }>(
    `SELECT count(DISTINCT a.match_id)::int AS games,
            count(DISTINCT a.match_id) FILTER (WHERE a.win)::int AS wins
       FROM match_participants a
       JOIN match_participants b ON b.match_id = a.match_id AND b.team_id = a.team_id AND b.puuid <> a.puuid
       JOIN matches m ON m.match_id = a.match_id AND m.game_duration >= 300
      WHERE a.puuid = $1 AND b.puuid = ANY($2::text[])`,
    [viewedPuuid, viewerPuuids],
  );
  return rows[0] ?? { games: 0, wins: 0 };
}
