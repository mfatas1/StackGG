import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { getPool, env } from "@crewstats/shared";
import type { QueueSlug, PanelId } from "@crewstats/shared";
import { getCrewBySlug, isCrewMember } from "@/lib/crews";
import { getCurrentUser } from "@/lib/session";
import {
  getCrewDashboard,
  getCrewAwards,
  getCrewRoleMatrix,
  getCrewMemberPuuids,
  getCrewTags,
  getCrewSessions,
  getLeaderboard,
  getActivity,
} from "@crewstats/stats";
import { parseQueueSlug } from "@/components/kit/Tabs";
import { Frame } from "@/components/kit/Frame";
import { AvatarStack } from "@/components/kit/Avatar";
import { CopyInvite, RefreshButton } from "@/components/CrewControls";
import { RoutePose } from "@/components/rift/RoutePose";
import { JoinWelcome } from "@/components/brand/JoinWelcome";
import { QueueProvider } from "@/components/board/QueueBoard";
import type { QueueBoards } from "@/components/board/QueueBoard";
import { PANEL_RENDERERS, type PanelContext } from "@/components/board/registry";
import { DashboardCanvas } from "@/components/DashboardCanvas";
import { resolveConfigForViewer } from "@/lib/dashboard-resolve";

const QUEUE_SLUGS: QueueSlug[] = ["all", "ranked", "flex", "aram", "arena"];

/**
 * Queue-INDEPENDENT base + panels (crew, members, cards, lineups, flex roles, awards,
 * role matrix, tags), cached on the crew. Computed via getCrewDashboard("all"); only its
 * queue-independent fields are used — the per-queue boards come from loadBoards.
 */
function loadBase(crewId: string, puuids: string[]) {
  return unstable_cache(
    async () => {
      const [d, awards, roleMatrix, tags, sessions] = await Promise.all([
        getCrewDashboard(getPool(), crewId, "all", puuids),
        getCrewAwards(getPool(), puuids),
        getCrewRoleMatrix(getPool(), puuids),
        getCrewTags(getPool(), puuids),
        getCrewSessions(getPool(), puuids),
      ]);
      return { d, awards, roleMatrix, tags, sessions };
    },
    ["crew-base", crewId, puuids.join(",")],
    { revalidate: 30, tags: [`crew:${crewId}`] },
  )();
}

/**
 * Per-queue leaderboard + activity for ALL queues, loaded once so the tabs switch in the
 * browser with zero round-trips. Small payload (a few rows/queue); cached + busted on Refresh.
 */
function loadBoards(crewId: string, puuids: string[]) {
  return unstable_cache(
    async (): Promise<QueueBoards> => {
      const entries = await Promise.all(
        QUEUE_SLUGS.map(async (slug) => {
          const [leaderboard, activity] = await Promise.all([
            getLeaderboard(getPool(), puuids, slug),
            getActivity(getPool(), puuids, slug, 20),
          ]);
          return [slug, { leaderboard, activity }] as const;
        }),
      );
      return Object.fromEntries(entries) as QueueBoards;
    },
    ["crew-boards", crewId, puuids.join(",")],
    { revalidate: 30, tags: [`crew:${crewId}`] },
  )();
}

export const dynamic = "force-dynamic";

export default async function CrewDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; created?: string; joined?: string }>;
}) {
  const { slug } = await params;
  const { q, created, joined } = await searchParams;
  const queue = parseQueueSlug(q);

  const crew = await getCrewBySlug(slug);
  if (!crew) notFound();
  // Fetch member puuids once, then run the dashboard + queue-independent panels in
  // parallel (was a 3-step waterfall, and puuids was queried twice per load).
  const puuids = await getCrewMemberPuuids(getPool(), crew.id);
  // Load the queue-independent base + all queues' boards once, both cached. Tab
  // switching then happens entirely client-side (QueueProvider) — no round-trips.
  const [base, boards] = await Promise.all([loadBase(crew.id, puuids), loadBoards(crew.id, puuids)]);
  const { d, awards, roleMatrix, tags, sessions } = base;
  if (!d) notFound();

  const inviteUrl = `${env().NEXT_PUBLIC_BASE_URL}/join/${crew.invite_code}`;
  const basePath = `/stack/${slug}`;

  // Resolve the layout for THIS viewer (docs/competitive-casual-revamp.md): owner & signed-out
  // see the public layout; a member with a personal override sees their own. We render every
  // known panel server-side into a node map so the in-page editor can add one with no round-trip.
  const viewer = await getCurrentUser();
  const isMember = viewer ? await isCrewMember(crew.id, viewer.id) : false;
  const isOwner = !!viewer && crew.owner_user_id === viewer.id;
  const config = await resolveConfigForViewer(crew, viewer?.id ?? null);

  const ctx: PanelContext = { d, awards, roleMatrix, tags, sessions, boards, crewSlug: slug, basePath };
  const nodes = Object.fromEntries(
    config.panels.map((p) => [p.id, PANEL_RENDERERS[p.id](ctx)]),
  ) as Record<PanelId, ReactNode>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <RoutePose name="surface" />

      {(created || joined) && <JoinWelcome mode={created ? "created" : "joined"} />}

      <Frame as="header">
        <div className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{d.crew.name}</h1>
            <p className="mt-1 text-sm text-ink-dim">
              {d.crew.memberCount} members · <span className="tnum">{d.cards.totalSharedGames}</span> shared games tracked
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AvatarStack members={d.members} crewSlug={slug} max={8} />
            <RefreshButton slug={slug} />
            <CopyInvite text={inviteUrl} />
            <Link href={`${basePath}/settings`} className="notch notch-sm grid h-9 w-9 place-items-center border border-line bg-bg/50 text-ink-dim backdrop-blur transition-colors hover:border-gold/50 hover:text-ink" aria-label="Stack settings">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Frame>

      <QueueProvider initial={queue} basePath={basePath}>
        <DashboardCanvas nodes={nodes} config={config} isMember={isMember} isOwner={isOwner} slug={slug} />
      </QueueProvider>
    </div>
  );
}
