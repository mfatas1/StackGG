import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPool, query, QUEUE_LABEL } from "@crewstats/shared";
import { getMatchDetail, getMatchTimeline } from "@/lib/match";
import { getViewerStack } from "@/lib/viewer";
import { MatchDetail } from "@/components/board/MatchDetail";
import { RoutePose } from "@/components/rift/RoutePose";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
  const { matchId } = await params;
  const data = await getMatchDetail(decodeURIComponent(matchId)); // cached, so the page load reuses this
  const queue = data ? QUEUE_LABEL[data.queueId] ?? "Game" : "Game";
  return { title: `${queue} — game detail · CrewStats`, robots: { index: false, follow: false } };
}

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const id = decodeURIComponent(matchId);
  const data = await getMatchDetail(id);
  if (!data) notFound();

  // Tracked crew members in this lobby + the on-demand timeline insights (drakes, gold
  // curve, item builds — fetched live, never stored) + the signed-in viewer's own stack
  // (to flag "in your stack"). All in parallel.
  const [tracked, timeline, viewer] = await Promise.all([
    query<{ puuid: string }>(`SELECT puuid FROM match_participants WHERE match_id = $1`, [id], getPool()),
    getMatchTimeline(id),
    getViewerStack(),
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
      />
    </div>
  );
}
