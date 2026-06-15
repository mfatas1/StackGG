import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPool, parseRiotId, findAccountByRiotId } from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { getCrewMemberPage, getCrewMemberPuuids, getMatchHistory } from "@crewstats/stats";
import { ProfileIcon, RankCrest } from "@/components/kit/Avatar";
import { StaleChip, SampleSize } from "@/components/kit/Badge";
import { Frame, Section, PanelHead, Empty } from "@/components/kit/Frame";
import { ModeCards } from "@/components/board/ModeCards";
import { MatchList } from "@/components/board/MatchList";
import { Percentiles } from "@/components/board/Percentiles";
import { QueueTabs, parseQueueSlug } from "@/components/kit/Tabs";
import { PlayerLink } from "@/components/kit/links";
import { RoutePose } from "@/components/rift/RoutePose";
import { pct } from "@/lib/format";

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
  const basePath = `/stack/${slug}/player/${encodeURIComponent(riotId)}`;
  const crewPuuids = await getCrewMemberPuuids(getPool(), crew.id);
  const history = await getMatchHistory(getPool(), account.puuid, { slug: queue, championId, limit: 20, crewPuuids });

  const best = page.partnerCompatibility[0];
  const worst = page.partnerCompatibility[page.partnerCompatibility.length - 1];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <RoutePose name="surface" />

      <Link href={`/stack/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {page.crew.name}
      </Link>

      <Frame as="header">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <ProfileIcon id={page.identity.profileIcon} name={page.identity.riotId} size={64} framed />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              <span>
                {page.identity.riotId}
                <span className="text-ink-faint">#{page.identity.tag}</span>
              </span>
              {page.identity.isStale && <StaleChip />}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Solo</span>
                <RankCrest rank={page.rankSolo} size={20} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Flex</span>
                <RankCrest rank={page.rankFlex} size={20} />
              </span>
            </div>
          </div>
        </div>
      </Frame>

      <Frame>
        <PanelHead title="Where they rank in the stack" />
        <div className="p-4 pt-4">
          <Percentiles rows={page.percentiles} />
        </div>
      </Frame>

      <ModeCards modes={page.modes} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Match history" action={<QueueTabs basePath={basePath} active={queue} preserve={{ champ }} />}>
          <MatchList items={history} basePath={basePath} crewSlug={slug} mePuuid={account.puuid} />
        </Section>

        <aside>
          <Frame>
            <PanelHead title="Partner compatibility" />
            <div className="p-4 pt-3">
              {page.partnerCompatibility.length === 0 ? (
                <Empty>No shared games with crewmates yet.</Empty>
              ) : (
                <>
                  {best && (
                    <p className="mb-3 text-sm text-ink-dim">
                      Wins most with{" "}
                      <span className="font-semibold text-ink">{(best.a.puuid === account.puuid ? best.b : best.a).riotId}</span>
                      {page.partnerCompatibility.length > 1 && worst && (
                        <>
                          , least with <span className="font-semibold text-ink">{(worst.a.puuid === account.puuid ? worst.b : worst.a).riotId}</span>
                        </>
                      )}
                      .
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {page.partnerCompatibility.map((sy) => {
                      const partner = sy.a.puuid === account.puuid ? sy.b : sy.a;
                      const good = (sy.winrate ?? 0) >= 0.5;
                      return (
                        <li key={partner.puuid} className="notch notch-sm flex items-center justify-between gap-2 border border-line/60 bg-surface-2/40 px-3 py-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <ProfileIcon id={partner.profileIcon} name={partner.riotId} size={22} />
                            <PlayerLink riotId={partner.riotId} tag={partner.tag} region={partner.region} crewSlug={slug} className="truncate font-medium" />
                          </span>
                          <span className={`shrink-0 font-mono tnum ${good ? "text-win" : "text-loss"}`}>
                            {pct(sy.winrate)} <SampleSize games={sy.games} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </Frame>
        </aside>
      </div>
    </div>
  );
}
