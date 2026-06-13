import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool, env } from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { getCrewDashboard } from "@crewstats/stats";
import { QueueTabs, parseQueueSlug } from "@/components/QueueTabs";
import { CopyButton } from "@/components/CopyButton";
import { ProfileIcon } from "@/components/Icons";
import { Card } from "@/components/primitives";
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
    <div className="space-y-6">
      {(created || joined) && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {created ? "Crew created! " : "You're in! "}
          Share the invite link to bring in the rest of the group.
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{d.crew.name}</h1>
          <p className="text-sm text-ink-dim">
            {d.crew.memberCount} members · {d.cards.totalSharedGames} shared games tracked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {d.members.slice(0, 8).map((m) => (
              <Link key={m.puuid} href={`${basePath}/player/${encodeURIComponent(m.riotId + "#" + m.tag)}`}>
                <ProfileIcon id={m.profileIcon} name={m.riotId} size={32} />
              </Link>
            ))}
          </div>
          <CopyButton text={inviteUrl} />
          <Link href={`${basePath}/settings`} className="btn-ghost">
            Settings
          </Link>
        </div>
      </header>

      <MetricCards d={d} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leaderboard</h2>
        <QueueTabs basePath={basePath} active={queue} />
      </div>

      <Card>
        <Leaderboard entries={d.leaderboard} slug={queue} crewSlug={slug} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Duo synergy">
          <SynergyPanel synergies={d.synergies} minGames={d.minSynergyGames} />
        </Card>
        <Card title="Head-to-head">
          <HeadToHeadPanel records={d.headToHead} />
        </Card>
      </div>

      {(queue === "all" || queue === "flex") && d.flexRoles.length > 0 && (
        <Card title="Flex role assignment">
          <FlexRolesPanel roles={d.flexRoles} />
        </Card>
      )}

      <Card title="Recent shared games">
        <ActivityFeed items={d.activity} />
      </Card>
    </div>
  );
}
