import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPool, query, QUEUE_LABEL } from "@crewstats/shared";
import { getMatchDetail, getMatchTimeline, getLobbySoloRanks } from "@/lib/match";
import { getViewerStack } from "@/lib/viewer";
import { MatchDetail } from "@/components/board/MatchDetail";
import { RoutePose } from "@/components/rift/RoutePose";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
  const { matchId } = await params;
  // Cheap title lookup — avoid loading the full match (and a Riot call) just for metadata.
  const rows = await query<{ queue_id: number }>(`SELECT queue_id FROM matches WHERE match_id = $1`, [decodeURIComponent(matchId)], getPool());
  const queue = rows[0] ? QUEUE_LABEL[rows[0].queue_id] ?? "Game" : "Game";
  return { title: `${queue} — game detail · StackGG`, robots: { index: false, follow: false } };
}

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const id = decodeURIComponent(matchId);
  // Live-first: full per-player stats + current-key puuids (stored raw for old games is
  // trimmed and key-stale). Falls back to stored raw if the live fetch fails.
  const data = await getMatchDetail(id, { preferLive: true });
  if (!data) notFound();

  // Tracked crew members in this lobby + the on-demand timeline insights (drakes, gold
  // curve, item builds — fetched live, never stored) + the signed-in viewer's own stack
  // (to flag "in your stack") + each player's solo-queue rank. All in parallel.
  const [tracked, timeline, viewer, ranks] = await Promise.all([
    query<{ puuid: string }>(`SELECT puuid FROM match_participants WHERE match_id = $1`, [id], getPool()),
    getMatchTimeline(id),
    getViewerStack(),
    getLobbySoloRanks(data.players.map((p) => p.puuid), data.region),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <RoutePose name="surface" />
      <MatchDetail
        data={data}
        tracked={tracked.map((t) => t.puuid)}
        stack={viewer.stackPuuids}
        me={viewer.myPuuids}
        timeline={timeline}
        ranks={ranks}
      />
    </div>
  );
}
