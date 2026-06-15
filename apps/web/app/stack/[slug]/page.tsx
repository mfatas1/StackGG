import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Settings } from "lucide-react";
import { getPool, env } from "@crewstats/shared";
import type { QueueSlug } from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { getCrewDashboard, getCrewAwards, getCrewRoleMatrix, getCrewMemberPuuids, getCrewTags } from "@crewstats/stats";

/**
 * Cached dashboard payload. The page is force-dynamic (auth/cookies), but the heavy
 * crew aggregations change only when a backfill/poll lands, so we serve them from the
 * data cache: tab switches and re-navigations within the TTL are instant instead of
 * recomputing every aggregation. Busted on manual Refresh (revalidateTag crew:<id>).
 */
function loadDashboard(crewId: string, queue: QueueSlug, puuids: string[]) {
  return unstable_cache(
    async () => {
      const [d, awards, roleMatrix, tags] = await Promise.all([
        getCrewDashboard(getPool(), crewId, queue, puuids),
        getCrewAwards(getPool(), puuids),
        getCrewRoleMatrix(getPool(), puuids),
        getCrewTags(getPool(), puuids),
      ]);
      return { d, awards, roleMatrix, tags };
    },
    ["crew-dashboard", crewId, queue, puuids.join(",")],
    { revalidate: 30, tags: [`crew:${crewId}`] },
  )();
}
import { QueueTabs, parseQueueSlug } from "@/components/kit/Tabs";
import { Frame, Section, PanelHead } from "@/components/kit/Frame";
import { AvatarStack } from "@/components/kit/Avatar";
import { CopyInvite, RefreshButton } from "@/components/CrewControls";
import { RoutePose } from "@/components/rift/RoutePose";
import { JoinWelcome } from "@/components/brand/JoinWelcome";
import { StatRail } from "@/components/board/StatRail";
import { Ladder } from "@/components/board/Ladder";
import { SynergyExplorer } from "@/components/board/SynergyExplorer";
import { Activity } from "@/components/board/Activity";
import { Awards } from "@/components/board/Awards";
import { RoleMatrix } from "@/components/board/RoleMatrix";
import { RiftMap } from "@/components/board/RiftMap";

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
  const { d, awards, roleMatrix, tags } = await loadDashboard(crew.id, queue, puuids);
  if (!d) notFound();

  const inviteUrl = `${env().NEXT_PUBLIC_BASE_URL}/join/${crew.invite_code}`;
  const basePath = `/stack/${slug}`;

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

      <StatRail d={d} crewSlug={slug} />

      <Section title="Leaderboard" action={<QueueTabs basePath={basePath} active={queue} />}>
        <Frame>
          <div className="p-3">
            <Ladder entries={d.leaderboard} queue={queue} crewSlug={slug} tags={tags} />
          </div>
        </Frame>
      </Section>

      <Section title="Who plays well together">
        <SynergyExplorer members={d.members} lineups={d.lineups} minGames={d.minSynergyGames} crewSlug={slug} />
      </Section>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Frame>
          <div className="flex h-full flex-col">
            <PanelHead title="Where everyone plays" />
            <div className="flex flex-1 flex-col p-4 pt-3">
              <RoleMatrix rows={roleMatrix} crewSlug={slug} fill />
            </div>
          </div>
        </Frame>
        <Frame>
          <PanelHead
            title="Records"
            action={
              awards.length > 0 ? (
                <Link href={`${basePath}/records`} className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint transition-colors hover:text-gold">
                  View all →
                </Link>
              ) : undefined
            }
          />
          <div className="p-4 pt-3">
            <Awards awards={awards} crewSlug={slug} limit={6} />
          </div>
        </Frame>
      </div>

      <Frame>
        <PanelHead title="Best in each lane" />
        <div className="p-4 pt-4">
          <RiftMap rows={roleMatrix} crewSlug={slug} />
        </div>
      </Frame>

      <Section title="Recent shared games">
        <Activity items={d.activity} />
      </Section>
    </div>
  );
}
