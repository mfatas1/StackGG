import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { getPool, env } from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { getCrewDashboard } from "@crewstats/stats";
import { QueueTabs, parseQueueSlug } from "@/components/QueueTabs";
import { CopyButton } from "@/components/CopyButton";
import { ProfileIcon } from "@/components/Icons";
import { PlayerLink } from "@/components/links";
import { Panel, PanelHeader } from "@/components/ui";
import {
  MetricCards,
  Leaderboard,
  SynergyPanel,
  HeadToHeadPanel,
  FlexRolesPanel,
  ActivityFeed,
} from "@/components/dashboard";

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
  const d = await getCrewDashboard(getPool(), crew.id, queue);
  if (!d) notFound();

  const inviteUrl = `${env().NEXT_PUBLIC_BASE_URL}/join/${crew.invite_code}`;
  const basePath = `/crew/${slug}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {(created || joined) && (
        <div className="animate-pop-in rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <span className="font-semibold">{created ? "Crew created! " : "You're in! "}</span>
          Share the invite link to bring in the rest of the squad.
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{d.crew.name}</h1>
          <p className="mt-1 text-sm text-ink-dim">
            {d.crew.memberCount} members · <span className="tnum">{d.cards.totalSharedGames}</span> shared games tracked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {d.members.slice(0, 8).map((m) => (
              <PlayerLink key={m.puuid} riotId={m.riotId} tag={m.tag} region={m.region} crewSlug={slug}>
                <span className="ring-2 ring-bg">
                  <ProfileIcon id={m.profileIcon} name={m.riotId} size={32} />
                </span>
              </PlayerLink>
            ))}
          </div>
          <CopyButton text={inviteUrl} />
          <Link href={`${basePath}/settings`} className="grid h-9 w-9 place-items-center rounded border border-line bg-surface text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink" aria-label="Crew settings">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <MetricCards d={d} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Leaderboard</h2>
        <QueueTabs basePath={basePath} active={queue} />
      </div>
      <Panel className="overflow-hidden">
        <Leaderboard entries={d.leaderboard} slug={queue} crewSlug={slug} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <PanelHeader title="Duo synergy" />
          <div className="px-1 pt-3">
            <SynergyPanel synergies={d.synergies} minGames={d.minSynergyGames} crewSlug={slug} />
          </div>
        </Panel>
        <Panel className="p-4">
          <PanelHeader title="Head-to-head" />
          <div className="px-1 pt-3">
            <HeadToHeadPanel records={d.headToHead} crewSlug={slug} />
          </div>
        </Panel>
      </div>

      {(queue === "all" || queue === "flex") && d.flexRoles.length > 0 && (
        <Panel className="p-4">
          <PanelHeader title="Flex role assignment" />
          <div className="pt-3">
            <FlexRolesPanel roles={d.flexRoles} crewSlug={slug} />
          </div>
        </Panel>
      )}

      <Panel className="p-4">
        <PanelHeader title="Recent shared games" />
        <div className="px-1 pt-3">
          <ActivityFeed items={d.activity} crewSlug={slug} />
        </div>
      </Panel>
    </div>
  );
}
