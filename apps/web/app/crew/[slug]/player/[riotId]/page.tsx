import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPool, parseRiotId, findAccountByRiotId, QUEUE_LABEL } from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { getCrewMemberPage, getCrewMemberPuuids, getMatchHistory } from "@crewstats/stats";
import { ChampIcon, ProfileIcon } from "@/components/Icons";
import { Panel, PanelHeader, SampleSize, Empty } from "@/components/ui";
import { MatchHistory } from "@/components/MatchHistory";
import { QueueTabs, parseQueueSlug } from "@/components/QueueTabs";
import { PlayerLink } from "@/components/links";
import { pct, rankString, placementSuffix } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; riotId: string }>;
  searchParams: Promise<{ q?: string; champ?: string }>;
}) {
  const { slug, riotId: raw } = await params;
  const { q, champ } = await searchParams;
  const riotId = decodeURIComponent(raw);
  const parsed = parseRiotId(riotId);
  if (!parsed) notFound();

  const crew = await getCrewBySlug(slug);
  if (!crew) notFound();
  const account = await findAccountByRiotId(parsed.name, parsed.tag);
  if (!account) notFound();
  const page = await getCrewMemberPage(getPool(), crew.id, account.puuid);
  if (!page) notFound();

  const queue = parseQueueSlug(q);
  const championId = champ ? Number(champ) : undefined;
  const basePath = `/crew/${slug}/player/${encodeURIComponent(riotId)}`;
  const crewPuuids = await getCrewMemberPuuids(getPool(), crew.id);
  const history = await getMatchHistory(getPool(), account.puuid, { slug: queue, championId, limit: 20, crewPuuids });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Link href={`/crew/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {page.crew.name}
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <ProfileIcon id={page.identity.profileIcon} name={page.identity.riotId} size={60} />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {page.identity.riotId}
            <span className="text-ink-faint">#{page.identity.tag}</span>
          </h1>
          <div className="mt-1 flex gap-3 text-sm text-ink-dim">
            <span>Solo: {rankString(page.rankSolo)}</span>
            <span>Flex: {rankString(page.rankFlex)}</span>
          </div>
        </div>
      </header>

      <Panel className="p-4">
        <PanelHeader title="Where they rank in the crew" />
        <div className="px-1 pt-4">
          {page.percentiles.length === 0 ? (
            <Empty>Not enough games to rank against the crew yet.</Empty>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {page.percentiles.map((p) => (
                <div key={p.stat}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-ink-dim">{p.stat}</span>
                    <span className="font-mono tnum">
                      {p.stat === "Win rate" ? pct(p.value) : p.value.toFixed(2)}
                      <span className="ml-2 text-2xs text-ink-faint">{p.percentile}th pctl</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-pill bg-surface-3">
                    <div className="h-full rounded-pill bg-primary transition-[width] duration-700 ease-out-expo" style={{ width: `${p.percentile}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {page.modes.map((m) => (
          <div key={m.queueId} className="rounded-lg border border-line bg-surface-2/60 p-4">
            <div className="text-2xs font-medium uppercase tracking-wide text-ink-faint">{QUEUE_LABEL[m.queueId]}</div>
            {m.games === 0 ? (
              <div className="mt-3 text-sm text-ink-faint">No games</div>
            ) : (
              <>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-display text-2xl font-bold tnum">
                    {m.queueSlug === "arena" && m.avgPlacement != null
                      ? placementSuffix(Math.round(m.avgPlacement))
                      : pct(m.winrate)}
                  </span>
                  <SampleSize games={m.games} />
                </div>
                <div className="mt-3 space-y-1.5">
                  {m.topChampions.slice(0, 3).map((c) => (
                    <div key={c.championId} className="flex items-center gap-2 text-2xs">
                      <ChampIcon name={c.championName} size={18} />
                      <span className="flex-1 truncate text-ink-dim">{c.championName}</span>
                      <span className="text-ink-faint tnum">{c.games}g</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Match history</h2>
            <QueueTabs basePath={basePath} active={queue} preserve={{ champ }} />
          </div>
          <MatchHistory items={history} basePath={basePath} crewSlug={slug} />
        </section>

        <aside>
          <Panel className="p-4">
            <PanelHeader title="Partner compatibility" />
            <div className="px-1 pt-3">
              {page.partnerCompatibility.length === 0 ? (
                <Empty>No shared games with crewmates yet.</Empty>
              ) : (
                <ul className="space-y-1.5">
                  {page.partnerCompatibility.map((sNergy) => {
                    const partner = sNergy.a.puuid === account.puuid ? sNergy.b : sNergy.a;
                    return (
                      <li
                        key={partner.puuid}
                        className="flex items-center justify-between rounded border border-line bg-surface-2/60 px-3 py-2 text-sm"
                      >
                        <PlayerLink riotId={partner.riotId} tag={partner.tag} region={partner.region} crewSlug={slug} className="font-medium" />
                        <span className="font-mono tnum">
                          {pct(sNergy.winrate)} <SampleSize games={sNergy.games} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
